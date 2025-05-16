import type { Note } from '@/types';

// This is a simple in-memory store. Data is lost on server restart.
// For a real application, use a database.
export let notes: Note[] = [];
