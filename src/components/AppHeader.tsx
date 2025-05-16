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
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Logo/Title */}
        <div className="flex items-center gap-2 text-lg font-semibold text-primary flex-shrink-0">
          <BookMarked className="h-6 w-6" />
          <span>Notes Offlines</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          <Input
            type="search"
            placeholder="Search notes..."
            className="flex-grow md:flex-grow-0 md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={() => openEditor()} size="sm" className="flex-shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> New Note
          </Button>
          <ConnectivityIndicator className="flex-shrink-0" />
        </div>
      </div>
    </header>
  );
}
