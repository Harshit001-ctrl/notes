import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notes } from '../store'; // Use shared store

// fetch a single note
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

//update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, content } = body; 

    const noteIndex = notes.findIndex(n => n.id === params.id);
    if (noteIndex === -1) {
    
      return NextResponse.json({ message: 'Note not found for update' }, { status: 404 });
    }

    const updatedNote = { ...notes[noteIndex] };
    if (title !== undefined) updatedNote.title = title;
    if (content !== undefined) updatedNote.content = content;
    
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

// delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const noteIndex = notes.findIndex(n => n.id === params.id);
  if (noteIndex === -1) {
    return NextResponse.json({ message: 'Note not found' }, { status: 404 });
  }

  notes.splice(noteIndex, 1);
  return new NextResponse(null, { status: 204 });
}
