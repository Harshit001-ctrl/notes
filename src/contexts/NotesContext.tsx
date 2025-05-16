'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentEditingNote, setCurrentEditingNote] = useState<LocalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const online = useOnlineStatus();
  const { toast } = useToast();

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
    if (!note) return 'unsynced'; // Should not happen if note is in list
    if (isSyncing && (currentEditingNote?.id === noteId || notes.find(n => n.id === noteId && !n.synced))) return 'syncing';
    if (note.synced) return 'synced';
    // TODO: Add more robust error state tracking per note
    // if (note._syncError) return 'error';
    return 'unsynced';
  }, [notes, isSyncing, currentEditingNote]);
  

  const syncNotes = useCallback(async () => {
    if (!online || isSyncing) return;

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
            await deleteNoteDB(localNote.id); // Hard delete after successful server deletion
          } else if (!localNote.synced) {
            const notePayload = { title: localNote.title, content: localNote.content, updatedAt: localNote.updatedAt };
            let upsertedNote: Note;
            // Check if note exists on server to decide POST or PUT
            const serverVersion = serverNotes.find(sn => sn.id === localNote.id);
            if (serverVersion) {
                upsertedNote = await updateNoteAPI(localNote.id, notePayload);
            } else {
                // Pass the local ID if it's a new note being synced for the first time
                upsertedNote = await createNoteAPI({ ...notePayload, id: localNote.id } as any); // API might generate its own ID or use provided
            }
            await updateNoteDB({ ...localNote, ...upsertedNote, synced: true, syncStatus: 'synced' });
          }
        } catch (error) {
          console.error(`Failed to sync note ${localNote.id}:`, error);
          await updateNoteDB({ ...localNote, syncStatus: 'error' });
          // Individual note sync error
        }
      }

      // 3. Process server notes to update local
      const freshLocalNotes = await getAllNotesDB(); // Re-fetch after pushes
      for (const serverNote of serverNotes) {
        const localVersion = freshLocalNotes.find(ln => ln.id === serverNote.id);
        if (!localVersion) { // New note from server
          await addNoteDB({ ...serverNote, synced: true, syncStatus: 'synced' });
        } else if (new Date(serverNote.updatedAt) > new Date(localVersion.updatedAt) && localVersion.synced && !localVersion._deleted) {
          // Server is newer, local is synced (no pending changes) and not marked for deletion
          await updateNoteDB({ ...localVersion, ...serverNote, synced: true, syncStatus: 'synced' });
        }
      }
      
      toast({ title: 'Sync Complete', description: 'Notes successfully synced.' });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({ title: 'Sync Error', description: 'Could not sync notes with the server.', variant: 'destructive' });
    } finally {
      await loadNotesFromDB(); // Refresh notes list
      setIsSyncing(false);
    }
  }, [online, isSyncing, toast, loadNotesFromDB]);

  useEffect(() => {
    loadNotesFromDB();
  }, [loadNotesFromDB]);

  useEffect(() => {
    if (online) {
      syncNotes();
    }
  }, [online, syncNotes]);

  const createOrUpdateNote = async (noteDetails: Partial<LocalNote>) => {
    const now = new Date().toISOString();
    let noteToSave: LocalNote;

    if (noteDetails.id && currentEditingNote) { // Updating existing note
      noteToSave = {
        ...currentEditingNote,
        ...noteDetails,
        updatedAt: now,
        synced: false,
        syncStatus: 'unsynced',
      };
      await updateNoteDB(noteToSave);
      toast({ title: 'Note Updated', description: `'${noteToSave.title}' saved locally.` });
    } else { // Creating new note
      noteToSave = {
        id: crypto.randomUUID(),
        title: noteDetails.title || 'Untitled Note',
        content: noteDetails.content || '',
        updatedAt: now,
        synced: false,
        syncStatus: 'unsynced',
        ...noteDetails, // allow passing other initial fields if any
      };
      await addNoteDB(noteToSave);
      toast({ title: 'Note Created', description: `'${noteToSave.title}' saved locally.` });
    }
    
    await loadNotesFromDB(); // Refresh list
    if (online) {
      // Non-blocking sync attempt
      syncNotes().catch(err => console.error("Post-save sync failed", err));
    }
    return noteToSave;
  };
  
  const debouncedCreateOrUpdateNote = useCallback(debounce(createOrUpdateNote, 500), [currentEditingNote, online, loadNotesFromDB, syncNotes, toast]);


  const handleAutoSave = useCallback(async (updatedFields: Partial<LocalNote>) => {
    if (!currentEditingNote && !isEditorOpen) return; // Not editing or editor not for new note

    const baseNote = currentEditingNote || { id: undefined, title: '', content: '' }; // Handle new note case for autosave
    
    const noteDataForAutosave = {
        ...baseNote,
        ...updatedFields,
    };

    // If it's a new note being auto-saved for the first time, it needs an ID to be "updatable" by debounce
    // This is tricky. Autosave should ideally work on an existing draft.
    // For a new note, the first "autosave" might be the explicit creation.
    // Let's assume autosave works primarily on `currentEditingNote` which implies it exists or is being created.
    if (currentEditingNote) {
      setCurrentEditingNote(prev => prev ? {...prev, ...updatedFields, updatedAt: new Date().toISOString(), synced: false, syncStatus: 'unsynced'} : null);
      await debouncedCreateOrUpdateNote(noteDataForAutosave);
    } else if (isEditorOpen && !currentEditingNote) { // New note scenario
        // For a brand new note, autosave might be complex without an initial ID.
        // A simpler approach is to rely on explicit save for new notes, or create a draft ID immediately.
        // For now, let's ensure currentEditingNote is set when editor opens for new.
    }

  }, [currentEditingNote, isEditorOpen, debouncedCreateOrUpdateNote]);


  const deleteNote = async (id: string) => {
    await markNoteAsDeletedDB(id);
    toast({ title: 'Note Deleted', description: 'Note marked for deletion locally.' });
    await loadNotesFromDB(); // Refresh list
    if (online) {
      syncNotes().catch(err => console.error("Post-delete sync failed", err));
    }
  };

  const getNoteById = (id: string): LocalNote | undefined => {
    return notes.find(note => note.id === id);
  };

  const openEditor = async (noteId?: string) => {
    if (noteId) {
      const note = await getNoteDB(noteId); // Fetch fresh from DB
      setCurrentEditingNote(note || null);
    } else {
      // For new note, create a temporary client-side representation or handle in NoteEditor
      setCurrentEditingNote(null); // Indicates new note mode
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentEditingNote(null);
    // Optional: Trigger sync if there were pending changes on the closing note
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
        createOrUpdateNote: handleAutoSave, // Use handleAutoSave for editor changes which then calls debounced version
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
