# Markdown Notes Sync Application

## Project Overview

Markdown Notes Sync is a web-based notes application designed for users who need reliable offline access and seamless data synchronization. Users can create, edit, and delete notes using Markdown for rich text formatting. Notes are persisted locally in IndexedDB, allowing full functionality even without an internet connection. When online, the application automatically syncs local changes with a mock backend API.

This project demonstrates capabilities in building offline-first applications with React, managing complex state, handling asynchronous operations, and implementing robust data synchronization strategies.

## Core Features

1.  **Note Creation & Editing**:
    *   Create new notes with a title and Markdown content.
    *   Edit existing notes with instant updates and automatic saving (debounced at 750ms).

2.  **Offline Persistence**:
    *   Notes are stored in IndexedDB for full offline functionality.
    *   Create, edit, and delete notes even when offline.
    *   Data persists across browser refreshes and restarts.

3.  **Syncing**:
    *   Automatic synchronization of local changes with the backend when online.
    *   Handles syncing of new notes, updates, and deletions.
    *   Implements a "last-write-wins" conflict resolution strategy, prioritizing client changes for its unsynced notes.
    *   Per-note sync status indicators: "Unsynced", "Syncing...", "Synced", "Error".

4.  **Connectivity Awareness**:
    *   Detects online/offline status using browser APIs.
    *   Clear UI indication of connection status and overall sync progress.

5.  **Note Listing & Searching**:
    *   Displays notes sorted by the last updated time (newest first).
    *   Search bar to filter notes by title or content.

6.  **User Experience**:
    *   Autosave with debounce during editing.
    *   Responsive and accessible UI built with ShadCN components and Tailwind CSS.
    *   Progressive Web App (PWA) with service worker for offline asset caching.

## Technical Stack

*   **Frontend**: Next.js (App Router), React (Hooks, Context API)
*   **Local Storage**: IndexedDB (via `idb` library)
*   **Markdown**: `react-markdown` for rendering
*   **Offline Detection**: Browser's `navigator.onLine` and `online`/`offline` events
*   **HTTP Client**: Fetch API
*   **Styling**: Tailwind CSS, ShadCN UI
*   **PWA**: `next-pwa` for service worker generation
*   **AI (Genkit)**: `genkit` and `@genkit-ai/googleai` (available, not actively used by core note features)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd markdown-notes-sync
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:9002`.

## Mock API

The application uses Next.js API Routes as its mock backend. The API endpoints are defined in `src/app/api/notes/`:

*   `GET /api/notes`: Fetches all notes.
*   `POST /api/notes`: Creates a new note. Can also handle upserts if an `id` is provided.
*   `PUT /api/notes/:id`: Updates an existing note.
*   `DELETE /api/notes/:id`: Deletes a note.

The data is stored in-memory on the server-side (`src/app/api/notes/store.ts`) and will be reset if the server restarts.

## Offline Functionality & Syncing

The application is designed to be offline-first. All note operations (create, edit, delete) are first applied to the local IndexedDB.
When the application detects an internet connection:
1.  It fetches the latest notes from the server.
2.  It pushes any local changes (new notes, updated notes, deleted notes) to the server.
3.  It pulls down any new or updated notes from the server that are not yet reflected locally or are newer than the local synced version.

This ensures that users can continue working without interruption, and their data will be synchronized when possible.
