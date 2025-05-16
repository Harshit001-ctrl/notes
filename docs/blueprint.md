# **App Name**: Markdown Notes Sync

## Core Features:

- Note Creation: Create a new markdown note with a title and content.
- Note Editing: Edit existing notes (title and content) with autosaving every 500ms. Uses 'submit' and 'cancel' buttons.
- Note Deletion & Sync Status: Delete notes via a 'delete' option in the 3-dot menu. Shows syncing status (Unsynced, Syncing..., Synced, Error).
- Offline Persistence: Persist notes locally using IndexedDB for offline access.
- Automatic Syncing: Automatically sync notes with a mock backend API when online; handles creation, updates, and deletions.
- Note Searching: Search notes by title or content using a search bar.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to convey reliability and calmness, reflecting the stable nature of data storage and synchronization.
- Background color: Light gray (#F0F4F8), providing a neutral backdrop that ensures readability and focuses attention on the notes themselves.
- Accent color: Orange (#FFB74D) to highlight interactive elements and syncing status, drawing the user's attention to important actions and information.
- Clean and modern sans-serif fonts for readability.
- Simple and intuitive icons for actions like create, edit, delete, and sync status.
- Clear and organized layout, prioritizing note content and easy navigation.