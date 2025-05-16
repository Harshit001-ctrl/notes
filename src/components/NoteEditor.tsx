
'use client';

import type { LocalNote } from '@/types';
import { useEffect, useState } from 'react';
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
    autoSaveNote,      // Renamed from createOrUpdateNote for auto-saving
    saveCurrentNote, // New function for explicit save with toast
  } = useNotes();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // localUpdatedAt is not strictly needed in editor state if context handles timestamps

  useEffect(() => {
    if (currentEditingNote) {
      setTitle(currentEditingNote.title);
      setContent(currentEditingNote.content);
    } else {
      // New note
      setTitle('');
      setContent('');
    }
  }, [currentEditingNote, isEditorOpen]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    autoSaveNote({ title: newTitle }); // Auto-save with new title
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    autoSaveNote({ content: newContent }); // Auto-save with new content
  };

  const handleSubmit = async () => {
    // Explicit save using the new context function
    await saveCurrentNote({ 
      // Pass only fields that might have changed in the editor
      // The ID and other essential fields are managed by currentEditingNote in context
      title: title || (currentEditingNote?.title || 'Untitled Note'), // Use local state, fallback to context, then default
      content: content || (currentEditingNote?.content || ''), // Use local state, fallback to context
    });
    closeEditor();
  };


  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentEditingNote && currentEditingNote.title ? 'Edit Note' : 'Create New Note'}</DialogTitle>
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
            {currentEditingNote && currentEditingNote.title ? 'Save Changes' : 'Create Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
