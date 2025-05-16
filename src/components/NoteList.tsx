"use client";

import { useNotes } from "@/contexts/NotesContext";
import { NoteCard } from "./NoteCard";
import { Skeleton } from "./ui/skeleton";

export function NoteList() {
  const { notes, isLoading, searchTerm } = useNotes();

  const filteredNotes = notes.filter(
    (note) =>
      !note._deleted &&
      (note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-muted-foreground">
          {searchTerm
            ? "No notes match your search."
            : "No notes yet. Create one!"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg shadow">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-end pt-2">
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
