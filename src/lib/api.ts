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

export async function createNoteAPI(noteData: Omit<Note, 'id' | 'synced'>): Promise<Note> {
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
  if (!response.ok) {
    // DELETE might return 204 No Content on success, or 200 with a message.
    // If it's not ok, and not 204, throw error.
    if (response.status !== 204) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete note' }));
      throw new Error(errorData.message || 'Failed to delete note');
    }
  }
}
