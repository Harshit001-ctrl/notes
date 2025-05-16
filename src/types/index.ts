export interface Note {
  id: string; // Unique UUID
  title: string;
  content: string; // Markdown text content
  updatedAt: string; // ISO timestamp of last update
  synced: boolean; // Whether note is synced with backend
}

// Extended interface for local IndexedDB storage
export interface LocalNote extends Note {
  _deleted?: boolean; // True if locally marked for deletion
  // UI-specific sync status, can be derived or explicitly set
  syncStatus?: 'synced' | 'unsynced' | 'syncing' | 'error';
}
