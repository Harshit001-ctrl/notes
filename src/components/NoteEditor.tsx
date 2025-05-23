
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
    autoSaveNote,
    saveCurrentNote,
  } = useNotes();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (currentEditingNote) {
      setTitle(currentEditingNote.title);
      setContent(currentEditingNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [currentEditingNote, isEditorOpen]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    autoSaveNote({ title: newTitle });
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    autoSaveNote({ content: newContent });
  };

  const handleSubmit = async () => {
    await saveCurrentNote({ 
      title: title || (currentEditingNote?.title || 'Untitled Note'),
      content: content || (currentEditingNote?.content || ''),
    });
    closeEditor();
  };


  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col"> {/* Changed max-width to 2xl */}
        <DialogHeader>
          <DialogTitle>{currentEditingNote && currentEditingNote.title ? 'Edit Note' : 'Create New Note'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 flex-grow overflow-y-auto">
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

          <div className="flex flex-row gap-4 flex-grow">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="content" className="text-left">Content (Markdown)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                placeholder="Write your note here..."
                className="flex-grow resize-none" />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="preview-area" className="text-left">Preview</Label>
              <div 
                id="preview-area" 
                className="p-4 border rounded-md bg-muted/50 flex-grow overflow-hidden" 
              >
                { (title || content) ? (
                  <article className="prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </article>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span>Preview will appear here</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
