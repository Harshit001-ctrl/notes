'use client';

import { NoteList } from '@/components/NoteList';
import { NoteEditor } from '@/components/NoteEditor';
import { useNotes } from '@/contexts/NotesContext'; // Ensure this path is correct

export default function HomePage() {
  const { isEditorOpen } = useNotes();

  return (
    <div className="space-y-8">
      <NoteList />
      {isEditorOpen && <NoteEditor />}
    </div>
  );
}
