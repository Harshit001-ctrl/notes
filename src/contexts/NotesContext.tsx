
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { LocalNote, Note } from '@/types';
import {
  getAllNotesDB,
  addNoteDB,
  updateNoteDB,
  deleteNoteDB,
  markNoteAsDeletedDB,
  getNoteDB,
} from '@/lib/db';
import { fetchNotesAPI, createNoteAPI, updateNoteAPI, deleteNoteAPI } from '@/lib/api';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import { debounce } from '@/lib/utils';

interface NotesContextType {
  notes: LocalNote[];
  isLoading: boolean;
  isSyncing: boolean;
  online: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  createOrUpdateNote: (noteDetails: Partial<LocalNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNoteById: (id: string) => LocalNote | undefined;
  currentEditingNote: LocalNote | null;
  isEditorOpen: boolean;
  openEditor: (noteId?: string) => void;
  closeEditor: () => void;
  syncNotes: () => Promise<void>;
  getNoteSyncStatus: (noteId: string) => LocalNote['syncStatus'];
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const SYNC_ERROR_COOLDOWN_MS = 5000; // 5 seconds cooldown after a major sync error

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentEditingNote, setCurrentEditingNote] = useState<LocalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const online = useOnlineStatus();
  const { toast } = useToast();

  const isSyncingGuardRef = useRef(false);
  const lastSyncErrorTimestampRef = useRef<number>(0);

  const loadNotesFromDB = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbNotes = await getAllNotesDB();
      setNotes(dbNotes.filter(note => !note._deleted));
    } catch (error) {
      console.error('Failed to load notes from DB:', error);
      toast({ title: 'Error', description: 'Could not load notes from local storage.', variant: 'destructive' });
    }
    setIsLoading(false);
  }, [toast]);

  const getNoteSyncStatus = useCallback((noteId: string): LocalNote['syncStatus'] => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return 'unsynced';
    if (isSyncing && (currentEditingNote?.id === noteId || notes.find(n => n.id === noteId && !n.synced))) return 'syncing';
    if (note.synced) return 'synced';
    // if (note._syncError) return 'error'; // TODO: Add more robust error state tracking per note
    return 'unsynced';
  }, [notes, isSyncing, currentEditingNote]);
  

  const syncNotes = useCallback(async () => {
    const now = Date.now();
    if (lastSyncErrorTimestampRef.current > 0 && (now - lastSyncErrorTimestampRef.current < SYNC_ERROR_COOLDOWN_MS)) {
        console.log(`Sync skipped: in error cooldown period. Remaining: ${Math.round((SYNC_ERROR_COOLDOWN_MS - (now - lastSyncErrorTimestampRef.current))/1000)}s`);
        return;
    }

    if (!online || isSyncingGuardRef.current) {
      console.log(`Sync skipped: Online: ${online}, Guard Ref: ${isSyncingGuardRef.current}`);
      return;
    }

    isSyncingGuardRef.current = true;
    setIsSyncing(true);
    toast({ title: 'Syncing...', description: 'Attempting to sync notes with the server.' });

    try {
      // 1. Fetch server notes
      const serverNotes = await fetchNotesAPI();
      const localNotes = await getAllNotesDB(); // Get all, including _deleted

      // 2. Process local changes to push to server
      for (const localNote of localNotes) {
        try {
          if (localNote._deleted) {
            await deleteNoteAPI(localNote.id);
            await deleteNoteDB(localNote.id); 
          } else if (!localNote.synced) {
            const notePayload = { title: localNote.title, content: localNote.content, updatedAt: localNote.updatedAt };
            let upsertedNote: Note;
            const serverVersion = serverNotes.find(sn => sn.id === localNote.id);
            if (serverVersion) {
                upsertedNote = await updateNoteAPI(localNote.id, notePayload);
            } else {
                upsertedNote = await createNoteAPI({ ...notePayload, id: localNote.id } as any);
            }
            await updateNoteDB({ ...localNote, ...upsertedNote, synced: true, syncStatus: 'synced' });
          }
        } catch (error) {
          console.error(`Failed to sync individual note ${localNote.id}:`, error);
          await updateNoteDB({ ...localNote, syncStatus: 'error' }); // Mark individual note as error
        }
      }

      // 3. Process server notes to update local
      const freshLocalNotes = await getAllNotesDB(); 
      for (const serverNote of serverNotes) {
        const localVersion = freshLocalNotes.find(ln => ln.id === serverNote.id);
        if (!localVersion) { 
          await addNoteDB({ ...serverNote, synced: true, syncStatus: 'synced' });
        } else if (new Date(serverNote.updatedAt) > new Date(localVersion.updatedAt) && localVersion.synced && !localVersion._deleted) {
          await updateNoteDB({ ...localVersion, ...serverNote, synced: true, syncStatus: 'synced' });
        }
      }
      
      toast({ title: 'Sync Complete', description: 'Notes successfully synced.' });
      lastSyncErrorTimestampRef.current = 0; // Reset error timestamp on successful sync
    } catch (error) {
      console.error('Overall sync failed:', error);
      toast({ title: 'Sync Error', description: 'Could not sync notes with the server.', variant: 'destructive' });
      lastSyncErrorTimestampRef.current = Date.now(); // Set error timestamp for cooldown
    } finally {
      await loadNotesFromDB(); 
      setIsSyncing(false);
      isSyncingGuardRef.current = false;
    }
  }, [online, toast, loadNotesFromDB]); // Removed setIsSyncing from here as it's a setter

  useEffect(() => {
    loadNotesFromDB();
  }, [loadNotesFromDB]);

  useEffect(() => {
    if (online) {
      syncNotes();
    }
  }, [online, syncNotes]);

  const createOrUpdateNoteInternal = async (noteDetails: Partial<LocalNote>) => {
    const now = new Date().toISOString();
    let noteToSave: LocalNote;

    if (noteDetails.id && currentEditingNote) { 
      noteToSave = {
        ...currentEditingNote,
        ...noteDetails,
        updatedAt: now,
        synced: false,
        syncStatus: 'unsynced',
      };
      await updateNoteDB(noteToSave);
      toast({ title: 'Note Updated', description: `'${noteToSave.title}' saved locally.` });
    } else { 
      noteToSave = {
        id: noteDetails.id || crypto.randomUUID(), // Use provided ID if exists (e.g. from autosave of new note)
        title: noteDetails.title || 'Untitled Note',
        content: noteDetails.content || '',
        updatedAt: now,
        synced: false,
        syncStatus: 'unsynced',
        ...noteDetails, 
      };
      // If it's a truly new note being saved, currentEditingNote might be null.
      // The editor might want to update its state with this new note.
      if(!currentEditingNote && isEditorOpen){
        setCurrentEditingNote(noteToSave); // Ensure currentEditingNote is set for new notes being saved
      }
      await addNoteDB(noteToSave);
      toast({ title: 'Note Created', description: `'${noteToSave.title}' saved locally.` });
    }
    
    await loadNotesFromDB(); 
    if (online) {
      syncNotes().catch(err => console.error("Post-save sync failed", err));
    }
    // The function needs to return something for the await in handleAutoSave.
    // Since the original autosave logic was about side effects, a void promise is fine.
    // Or return the noteToSave if it's useful. For now, void.
  };
  
  // Debounce dependencies: `online` and `syncNotes` are stable or change infrequently.
  // `loadNotesFromDB` is stable. `toast` is stable.
  // `currentEditingNote` is the main varying dependency for the *creation* of the debounced function.
  const debouncedCreateOrUpdateNote = useCallback(debounce(createOrUpdateNoteInternal, 750), [currentEditingNote, online, loadNotesFromDB, syncNotes, toast]);


  const handleAutoSave = useCallback(async (updatedFields: Partial<LocalNote>) => {
    let noteDataForAutosave: Partial<LocalNote>;

    if (currentEditingNote) {
      noteDataForAutosave = {
        ...currentEditingNote,
        ...updatedFields,
      };
       setCurrentEditingNote(prev => prev ? {...prev, ...updatedFields, updatedAt: new Date().toISOString(), synced: false, syncStatus: 'unsynced'} : null);
    } else if (isEditorOpen && !currentEditingNote ) { // New note scenario in editor
        // Create a temporary structure for the new note being typed
        noteDataForAutosave = {
            // id: undefined, // No ID yet, createOrUpdateNoteInternal will generate
            title: updatedFields.title || '',
            content: updatedFields.content || '',
            ...updatedFields, // allow passing other initial fields if any
        };
        // Don't call setCurrentEditingNote here for a new note before it's saved,
        // let createOrUpdateNoteInternal handle setting it if it creates the note.
    } else {
        return; // Not editing or editor not for new note.
    }
    await debouncedCreateOrUpdateNote(noteDataForAutosave);

  }, [currentEditingNote, isEditorOpen, debouncedCreateOrUpdateNote]);


  const deleteNote = async (id: string) => {
    await markNoteAsDeletedDB(id);
    toast({ title: 'Note Deleted', description: 'Note marked for deletion locally.' });
    await loadNotesFromDB(); 
    if (online) {
      syncNotes().catch(err => console.error("Post-delete sync failed", err));
    }
  };

  const getNoteById = (id: string): LocalNote | undefined => {
    return notes.find(note => note.id === id);
  };

  const openEditor = async (noteId?: string) => {
    if (noteId) {
      const note = await getNoteDB(noteId); 
      setCurrentEditingNote(note || null);
    } else {
      // For a new note, explicitly create a placeholder.
      // This placeholder will be updated by autosave and eventually saved.
      const newPlaceholderNote: LocalNote = {
        id: crypto.randomUUID(), // Assign a temporary ID for autosave to work on
        title: '',
        content: '',
        updatedAt: new Date().toISOString(),
        synced: false,
        syncStatus: 'unsynced',
      };
      setCurrentEditingNote(newPlaceholderNote);
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    // Before closing, ensure any pending debounced save is flushed
    // This is tricky with debounce, as flushing isn't standard.
    // The explicit save button in NoteEditor handles the final save.
    // Or, we could trigger the debounced function one last time with current state if needed.
    // For now, rely on the explicit save or the natural debounce timeout.
    
    setIsEditorOpen(false);
    setCurrentEditingNote(null);
    if (online) syncNotes().catch(err => console.error("Post-editor-close sync failed", err));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        isLoading,
        isSyncing,
        online,
        searchTerm,
        setSearchTerm,
        createOrUpdateNote: handleAutoSave, 
        deleteNote,
        getNoteById,
        currentEditingNote,
        isEditorOpen,
        openEditor,
        closeEditor,
        syncNotes,
        getNoteSyncStatus
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

