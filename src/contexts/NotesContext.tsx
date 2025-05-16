
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
  autoSaveNote: (updatedFields: Partial<Omit<LocalNote, 'id'>>) => Promise<void>; // Renamed for clarity
  saveCurrentNote: (updatedFields: Partial<Omit<LocalNote, 'id'>>) => Promise<LocalNote | void>; // For explicit save
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
    // Toast for sync starting is okay, as it's a background process
    toast({ title: 'Syncing...', description: 'Attempting to sync notes with the server.' });

    try {
      const serverNotes = await fetchNotesAPI();
      const localNotes = await getAllNotesDB(); 

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
          await updateNoteDB({ ...localNote, syncStatus: 'error' });
        }
      }

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
      lastSyncErrorTimestampRef.current = 0; 
    } catch (error) {
      console.error('Overall sync failed:', error);
      toast({ title: 'Sync Error', description: 'Could not sync notes with the server.', variant: 'destructive' });
      lastSyncErrorTimestampRef.current = Date.now(); 
    } finally {
      await loadNotesFromDB(); 
      setIsSyncing(false);
      isSyncingGuardRef.current = false;
    }
  }, [online, toast, loadNotesFromDB]);

  useEffect(() => {
    loadNotesFromDB();
  }, [loadNotesFromDB]);

  useEffect(() => {
    if (online) {
      syncNotes();
    }
  }, [online, syncNotes]);

  // Internal function to handle actual DB operations and optional toasts
  const createOrUpdateNoteInternal = useCallback(async (noteToSave: LocalNote, options: { isAutoSave: boolean }) => {
    const noteExists = await getNoteDB(noteToSave.id);
    let savedNote: LocalNote = { ...noteToSave }; // Ensure we have a full LocalNote object

    if (noteExists) {
      savedNote = { ...noteExists, ...noteToSave }; // Merge with existing if any fields are missing
      await updateNoteDB(savedNote);
      if (!options.isAutoSave) {
        toast({ title: 'Note Updated', description: `'${savedNote.title}' saved.` });
      }
    } else {
      await addNoteDB(savedNote);
      if (!options.isAutoSave) {
        toast({ title: 'Note Created', description: `'${savedNote.title}' created.` });
      }
      // If it was a new note, ensure currentEditingNote in context is updated.
      // This is important because the initial currentEditingNote might be a minimal placeholder.
       setCurrentEditingNote(savedNote);
    }
    
    await loadNotesFromDB(); 
    if (online) {
      syncNotes().catch(err => console.error("Post-save/create sync failed", err));
    }
    return savedNote;
  }, [loadNotesFromDB, online, syncNotes, toast, setCurrentEditingNote]);


  const debouncedAutoSave = useCallback(
    debounce((note: LocalNote) => createOrUpdateNoteInternal(note, { isAutoSave: true }), 750),
    [createOrUpdateNoteInternal]
  );

  const autoSaveNote = useCallback(async (updatedFields: Partial<Omit<LocalNote, 'id'>>) => {
    if (!currentEditingNote) return;

    const noteForSaveOp: LocalNote = {
      ...currentEditingNote,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
      synced: false,
      syncStatus: 'unsynced',
    };
    // Optimistically update currentEditingNote for responsive UI in editor
    setCurrentEditingNote(noteForSaveOp); 
    debouncedAutoSave(noteForSaveOp);
  }, [currentEditingNote, setCurrentEditingNote, debouncedAutoSave]);

  const saveCurrentNote = useCallback(async (updatedFields: Partial<Omit<LocalNote, 'id'>>) => {
    if (!currentEditingNote) {
       // Fallback: if no currentEditingNote, create a new one from scratch.
       // This might happen if editor is used to create a new note and `openEditor` wasn't complete.
      const newNote: LocalNote = {
        id: crypto.randomUUID(),
        title: updatedFields.title || 'Untitled Note',
        content: updatedFields.content || '',
        updatedAt: new Date().toISOString(),
        synced: false,
        syncStatus: 'unsynced',
      };
      return createOrUpdateNoteInternal(newNote, { isAutoSave: false });
    }

    const noteToSave: LocalNote = {
      ...currentEditingNote,
      ...updatedFields,
      updatedAt: new Date().toISOString(), 
      synced: false,
      syncStatus: 'unsynced',
    };
    setCurrentEditingNote(noteToSave); // Update editor state immediately
    return createOrUpdateNoteInternal(noteToSave, { isAutoSave: false });
  }, [currentEditingNote, setCurrentEditingNote, createOrUpdateNoteInternal]);


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
      const newPlaceholderNote: LocalNote = {
        id: crypto.randomUUID(), 
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
    setIsEditorOpen(false);
    setCurrentEditingNote(null);
    // Syncing after closing editor might be useful to ensure last changes are pushed if not debounced yet.
    // However, the explicit save button handles this.
    // if (online) syncNotes().catch(err => console.error("Post-editor-close sync failed", err));
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
        autoSaveNote, 
        saveCurrentNote,
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
