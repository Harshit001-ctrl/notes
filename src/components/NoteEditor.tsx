'use client';

import type { LocalNote } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useNotes } from '@/contexts/NotesContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Label } from './ui/label';

export function NoteEditor() {
  const {
    currentEditingNote,
    isEditorOpen,
    closeEditor,
    createOrUpdateNote, // This is the debounced auto-save function from context
  } = useNotes();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | undefined>();


  useEffect(() => {
    if (currentEditingNote) {
      setTitle(currentEditingNote.title);
      setContent(currentEditingNote.content);
      setLocalUpdatedAt(currentEditingNote.updatedAt);
    } else {
      // New note
      setTitle('');
      setContent('');
      setLocalUpdatedAt(undefined);
    }
  }, [currentEditingNote, isEditorOpen]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Autosave is triggered by createOrUpdateNote via context which is debounced
    createOrUpdateNote({ id: currentEditingNote?.id, title: newTitle, content, updatedAt: localUpdatedAt });
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    // Autosave
    createOrUpdateNote({ id: currentEditingNote?.id, title, content: newContent, updatedAt: localUpdatedAt });
  };

  const handleSubmit = async () => {
    // Explicit save - mainly ensures the latest state is captured if autosave hasn't fired
    // The debounced createOrUpdateNote handles the actual saving logic.
    // We can force one last call or rely on its existing queue.
    // For simplicity, we'll let autosave handle it, this button primarily closes.
    // Or, we can do an immediate save here.
    const noteToSave: Partial<LocalNote> = {
        id: currentEditingNote?.id, // Will be undefined for new notes, handled by createOrUpdateNote
        title: title || 'Untitled Note',
        content: content,
        updatedAt: new Date().toISOString(), // Force update timestamp on explicit save
    };
    await createOrUpdateNote(noteToSave); // This now calls the debounced/auto-save function
    closeEditor();
  };


  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentEditingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-grow overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-left">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title"
              className="text-lg"
            />
          </div>
          <div className="grid gap-2 flex-grow">
            <Label htmlFor="content" className="text-left">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              placeholder="Write your note here..."
              className="min-h-[200px] flex-grow resize-none"
            />
          </div>
          { (title || content) && (
             <div className="mt-4 p-4 border rounded-md bg-muted/50 max-h-60 overflow-y-auto">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Preview</h3>
                <article className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </article>
             </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            {currentEditingNote ? 'Save Changes' : 'Create Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
