import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { LocalNote } from '@/types';

const DB_NAME = 'MarkdownNotesDB';
const DB_VERSION = 1;
const NOTES_STORE_NAME = 'notes';

interface NotesDB extends DBSchema {
  [NOTES_STORE_NAME]: {
    key: string;
    value: LocalNote;
    indexes: { 'updatedAt': string };
  };
}

let dbPromise: Promise<IDBPDatabase<NotesDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<NotesDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<NotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
          const store = db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
};


export async function getAllNotesDB(): Promise<LocalNote[]> {
  const db = await getDb();
  return db.getAllFromIndex(NOTES_STORE_NAME, 'updatedAt').then(notes => notes.reverse()); // Sort by newest first
}

export async function getNoteDB(id: string): Promise<LocalNote | undefined> {
  const db = await getDb();
  return db.get(NOTES_STORE_NAME, id);
}

export async function addNoteDB(note: LocalNote): Promise<string> {
  const db = await getDb();
  return db.add(NOTES_STORE_NAME, note);
}

export async function updateNoteDB(note: LocalNote): Promise<string> {
  const db = await getDb();
  return db.put(NOTES_STORE_NAME, note);
}

export async function deleteNoteDB(id: string): Promise<void> {
  const db = await getDb();
  return db.delete(NOTES_STORE_NAME, id);
}

// Soft delete: mark as deleted, then sync, then hard delete
export async function markNoteAsDeletedDB(id: string): Promise<string | void> {
  const db = await getDb();
  const note = await db.get(NOTES_STORE_NAME, id);
  if (note) {
    note._deleted = true;
    note.synced = false; // Needs to sync this deletion
    note.updatedAt = new Date().toISOString();
    return db.put(NOTES_STORE_NAME, note);
  }
}
