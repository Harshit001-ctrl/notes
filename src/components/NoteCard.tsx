
'use client';

import type { LocalNote } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit3, Trash2, CheckCircle, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotes } from '@/contexts/NotesContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteCardProps {
  note: LocalNote;
}

export function NoteCard({ note }: NoteCardProps) {
  const { deleteNote, openEditor, getNoteSyncStatus } = useNotes();
  const syncStatus = getNoteSyncStatus(note.id);

  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" /> Synced</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="text-accent border-accent"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Syncing...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Error</Badge>;
      case 'unsynced':
      default:
        return <Badge variant="secondary"><WifiOff className="mr-1 h-3 w-3" /> Unsynced</Badge>;
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-semibold">{note.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Last updated: {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Note options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditor(note.id)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-h-32 overflow-y-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content.length > 150 ? `${note.content.substring(0, 150)}...` : note.content}
          </ReactMarkdown>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        {renderSyncBadge()}
      </CardFooter>
    </Card>
  );
}

