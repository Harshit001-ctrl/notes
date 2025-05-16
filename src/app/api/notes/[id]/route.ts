import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notes } from '../store'; // Use shared store

// GET /api/notes/:id - fetch a single note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const note = notes.find(n => n.id === params.id);
  if (note) {
    return NextResponse.json(note);
  }
  return NextResponse.json({ message: 'Note not found' }, { status: 404 });
}

// PUT /api/notes/:id - update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, content } = body; // Can also include updatedAt from client

    const noteIndex = notes.findIndex(n => n.id === params.id);
    if (noteIndex === -1) {
      // If note not found, client might be trying to PUT a new note with specific ID.
      // Depending on API design, could create it (upsert) or return 404.
      // For this example, let's stick to 404 if strictly updating.
      // If client sends an ID for a new note, it should POST, or POST should handle upsert logic based on ID.
      return NextResponse.json({ message: 'Note not found for update' }, { status: 404 });
    }

    const updatedNote = { ...notes[noteIndex] };
    if (title !== undefined) updatedNote.title = title;
    if (content !== undefined) updatedNote.content = content;
    
    // Use client's updatedAt if provided and valid, otherwise server sets it
    // This helps with "last-write-wins" if client sends its timestamp
    const clientUpdatedAt = body.updatedAt;
    if (clientUpdatedAt && !isNaN(new Date(clientUpdatedAt).getTime())) {
        updatedNote.updatedAt = new Date(clientUpdatedAt).toISOString();
    } else {
        updatedNote.updatedAt = new Date().toISOString();
    }
    updatedNote.synced = true;

    notes[noteIndex] = updatedNote;
    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error(`PUT /api/notes/${params.id} error:`, error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}

// DELETE /api/notes/:id - delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const noteIndex = notes.findIndex(n => n.id === params.id);
  if (noteIndex === -1) {
    return NextResponse.json({ message: 'Note not found' }, { status: 404 });
  }

  notes.splice(noteIndex, 1);
  // Standard practice is to return 204 No Content for successful DELETE
  return new NextResponse(null, { status: 204 });
}
