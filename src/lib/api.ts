
import type { Note } from '@/types';

// IMPORTANT: This should be replaced with your actual mock API endpoint.
// For this example, we are using Next.js API routes as the mock backend.
const API_BASE_URL = '/api/notes';

export async function fetchNotesAPI(): Promise<Note[]> {
  const response = await fetch(API_BASE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch notes');
  }
  return response.json();
}

// Define a more specific type for the payload, allowing id to be optional
export type NoteCreationPayload = Omit<Note, 'synced'>;


export async function createNoteAPI(noteData: NoteCreationPayload): Promise<Note> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create note' }));
    throw new Error(errorData.message || 'Failed to create note');
  }
  return response.json();
}

export async function updateNoteAPI(id: string, noteData: Partial<Omit<Note, 'id'>>): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update note' }));
    throw new Error(errorData.message || 'Failed to update note');
  }
  return response.json();
}

export async function deleteNoteAPI(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  // If the response is ok (e.g., 200, 204 for successful delete)
  // OR if it's a 404 (Not Found - meaning it's already gone),
  // we consider the operation successful or a no-op.
  if (response.ok || response.status === 404) {
    return; // Successful deletion or note was already deleted.
  }

  // For any other error status, try to parse the message and throw.
  // This covers actual server errors (5xx) or other unexpected client errors (4xx).
  let errorMessage = `Failed to delete note. Status: ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorMessage;
  } catch (e) {
    // Ignore if response body is not JSON or empty
  }
  throw new Error(errorMessage);
}
