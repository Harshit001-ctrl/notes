'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, BookMarked } from 'lucide-react';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { useNotes } from '@/contexts/NotesContext';

export function AppHeader() {
  const { searchTerm, setSearchTerm, openEditor } = useNotes();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
          <BookMarked className="h-6 w-6" />
          <span>Markdown Notes</span>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Input
              type="search"
              placeholder="Search notes..."
              className="md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => openEditor()} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> New Note
          </Button>
          <ConnectivityIndicator />
        </div>
      </div>
    </header>
  );
}
