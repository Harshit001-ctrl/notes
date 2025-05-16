import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Note } from '@/types';
import { notes } from './store'; // Use shared store

// GET /api/notes - fetch all notes
export async function GET() {
  return NextResponse.json(notes);
}

// POST /api/notes - create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, id: providedId } = body;

    if (!title || typeof title !== 'string' || (content === undefined || typeof content !== 'string') ) { // content can be empty string
      return NextResponse.json({ message: 'Title and content are required parameters' }, { status: 400 });
    }
    
    const id = providedId || crypto.randomUUID();

    const existingNoteIndex = notes.findIndex(note => note.id === id);
    if (existingNoteIndex > -1 && providedId) { // If ID was provided and exists, treat as update (upsert)
        const updatedNote: Note = {
            ...notes[existingNoteIndex],
            title,
            content,
            updatedAt: new Date().toISOString(),
            synced: true,
        };
        notes[existingNoteIndex] = updatedNote;
        return NextResponse.json(updatedNote, { status: 200 });
    }
    
    // If ID is new or no ID provided (generate new one)
    if (notes.some(note => note.id === id)) {
      // This case should ideally not happen if UUIDs are unique and client correctly manages new vs existing
      return NextResponse.json({ message: 'Note with this ID already exists (generated ID conflict)' }, { status: 409 });
    }

    const newNote: Note = {
      id,
      title,
      content,
      updatedAt: new Date().toISOString(),
      synced: true, 
    };
    notes.push(newNote);
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}
