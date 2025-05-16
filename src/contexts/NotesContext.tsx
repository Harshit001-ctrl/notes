
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
import { fetchNotesAPI, createNoteAPI, updateNoteAPI, deleteNoteAPI, type NoteCreationPayload } from '@/lib/api';
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
  autoSaveNote: (updatedFields: Partial<Omit<LocalNote, 'id'>>) => Promise<void>;
  saveCurrentNote: (updatedFields: Partial<Omit<LocalNote, 'id'>>) => Promise<LocalNote | void>;
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
    if (!note || !note.syncStatus) return 'unsynced';

    if (isSyncing && (note.syncStatus === 'unsynced' || note.syncStatus === 'error')) {
        return 'syncing';
    }
    return note.syncStatus;
  }, [notes, isSyncing]);


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
      const serverNotes = await fetchNotesAPI();
      const localNotes = await getAllNotesDB();

      for (const localNote of localNotes) {
        try {
          if (localNote._deleted) {
            await deleteNoteAPI(localNote.id);
            await deleteNoteDB(localNote.id);
          } else if (!localNote.synced) { 
            const notePayload: NoteCreationPayload = {
              id: localNote.id,
              title: localNote.title,
              content: localNote.content,
              updatedAt: localNote.updatedAt
            };
            let upsertedNote: Note;
            const serverVersion = serverNotes.find(sn => sn.id === localNote.id);
            if (serverVersion) {
                const updatePayload = { title: localNote.title, content: localNote.content, updatedAt: localNote.updatedAt };
                upsertedNote = await updateNoteAPI(localNote.id, updatePayload);
            } else {
                upsertedNote = await createNoteAPI(notePayload);
            }
            await updateNoteDB({ ...localNote, ...upsertedNote, synced: true, syncStatus: 'synced' });
          }
        } catch (error) {
          console.error(`Failed to sync individual note ${localNote.id}:`, error);
          await updateNoteDB({ ...localNote, synced: false, syncStatus: 'error' }); 
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

  const createOrUpdateNoteInternal = useCallback(async (noteToSave: LocalNote, options: { isAutoSave: boolean }) => {
    const noteExists = await getNoteDB(noteToSave.id);
    let savedNote: LocalNote = { ...noteToSave };

    if (noteExists) {
      savedNote = { ...noteExists, ...noteToSave };
      await updateNoteDB(savedNote);
      if (!options.isAutoSave) {
        toast({ title: 'Note Updated', description: `'${savedNote.title}' saved.` });
      }
    } else {
      await addNoteDB(savedNote);
      if (!options.isAutoSave) {
        toast({ title: 'Note Created', description: `'${savedNote.title}' created.` });
      }
       setCurrentEditingNote(savedNote); 
    }

    await loadNotesFromDB();
    if (online) {
      syncNotes().catch(err => console.error("Post-save/create sync failed", err));
    }
    return savedNote;
  }, [loadNotesFromDB, online, syncNotes, toast]);


  const debouncedAutoSave = useCallback(
    debounce((note: LocalNote) => createOrUpdateNoteInternal(note, { isAutoSave: true }), 500),
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
    setCurrentEditingNote(noteForSaveOp); 
    debouncedAutoSave(noteForSaveOp);
  }, [currentEditingNote, debouncedAutoSave]);

  const saveCurrentNote = useCallback(async (updatedFields: Partial<Omit<LocalNote, 'id'>>) => {
    let noteToSave: LocalNote;
    if (currentEditingNote && currentEditingNote.id) { 
      noteToSave = {
        ...currentEditingNote,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
        synced: false, 
        syncStatus: 'unsynced',
      };
    } else { 
      noteToSave = {
        id: currentEditingNote?.id || crypto.randomUUID(), 
        title: updatedFields.title || 'Untitled Note',
        content: updatedFields.content || '',
        updatedAt: new Date().toISOString(),
        synced: false,
        syncStatus: 'unsynced',
      };
    }
    setCurrentEditingNote(noteToSave); 
    return createOrUpdateNoteInternal(noteToSave, { isAutoSave: false });
  }, [currentEditingNote, createOrUpdateNoteInternal]);


  const deleteNote = async (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) {
      console.warn(`Attempted to delete non-existent note with id: ${id}`);
      return;
    }

    // Optimistic UI update
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    toast({ title: 'Note Deleted', description: `'${noteToDelete.title}' removed.` });

    try {
      await markNoteAsDeletedDB(id);

      if (online) {
        syncNotes().catch(async (syncErr) => {
          console.error("Post-delete sync failed:", syncErr);
        });
      }
    } catch (error) {
      console.error(`Failed to mark note ${id} as deleted in DB:`, error);
      toast({ title: 'Deletion Error', description: 'Could not save deletion status locally. Please try again.', variant: 'destructive' });
      await loadNotesFromDB();
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
    if (online) {
      syncNotes().catch(err => console.error("Post-editor-close sync failed", err));
    }
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

