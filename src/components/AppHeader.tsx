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
        <div className="flex items-center gap-2 text-lg font-semibold text-primary flex-shrink-0">
          <BookMarked className="h-6 w-6" />
          <span>Notes Offline</span>
        </div>
        
        {/* Action items group */}
        {/* On mobile (default): items start-aligned, search input grows. */}
        {/* On desktop (md+): items center-aligned. */}
        <div className="flex flex-1 items-center justify-start md:justify-center space-x-4 ml-4 sm:ml-0">
          <Input
            type="search"
            placeholder="Search notes..."
            // Mobile: flex-grow allows it to take available space.
            // Desktop: md:flex-grow-0 stops it from growing, md:w-64 sets a fixed width.
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
