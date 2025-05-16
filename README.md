
# Markdown Notes Sync

**It is live on - https://notes-harshit.vercel.app/ **


## 🏁 Getting Started

Ready to run the app locally? Here's how:

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn (or your preferred Node.js package manager)

### Installation

1.  **Clone the repository**:
2.  **Install dependencies**:
    ```bash
    npm install

### Running the Application

1.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

**Your go-to offline-first Markdown notes app that keeps everything in sync!**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Feel free to change this if you use a different license -->

<!-- TODO: If you deploy this app, add a link to your live demo here! -->
<!-- e.g., [View Live Demo](https://your-app-url.com) -->

Markdown Notes Sync is a web application designed for anyone who loves the simplicity of Markdown and needs reliable access to their notes, even without an internet connection. Create, edit, and organize your thoughts seamlessly, knowing your data is safe locally and synced to a mock backend when you're back online.



##  Core Features

This app is packed with features to make your note-taking experience smooth and efficient:

1.  ** Note Creation & Editing**:
    *   Easily create new notes with a title and your content in Markdown.
    *   Edit existing notes with an instant live preview.
    *   **Autosave magic**: Changes are saved automatically in the background (debounced at 500ms) so you never lose your work.

2.  ** Offline Persistence**:
    *   **Truly offline-first**: All notes are stored locally in your browser's IndexedDB.
    *   Full functionality (create, edit, delete) is available even when you're completely offline.
    *   Your data stays put across browser refreshes and restarts.

3.  ** Smart Syncing**:
    *   **Automatic sync**: When you're online, the app automatically syncs local changes with the mock backend.
    *   Handles new notes, updates to existing notes, and deletions.
    *   **Conflict resolution**: Implements a "last-write-wins" strategy, prioritizing client changes for notes that haven't been synced yet.
    *   **Clear status indicators**: Each note visually shows its sync status ("Unsynced", "Syncing...", "Synced", "Error").

4.  **📶 Connectivity Awareness**:
    *   Intelligently detects your online/offline status using browser APIs.
    *   Provides clear UI feedback on your connection and overall sync progress.

5.  ** Note Listing & Searching**:
    *   Notes are displayed neatly, sorted by the last updated time (newest first).
    *   A handy search bar lets you quickly filter notes by title or content.

6.  ** User Experience**:
    *   Sleek, responsive, and accessible UI built with modern tools.
    *   **Progressive Web App (PWA)**: Installable on your device with a service worker for offline asset caching, providing an app-like experience.

## 🛠️ Tech Stack

This project leverages a modern and robust set of technologies:
  **Frontend**: Next.js ,typescript , tailwind css (App Router), React (Hooks, Context API)
   **Local Storage**: IndexedDB (via `idb` library for a friendlier API)
   **Markdown Rendering**: `react-markdown` with `remark-gfm` for GitHub Flavored Markdown
   **Offline Detection**: Browser's `navigator.onLine` and `online`/`offline` events
   **HTTP Client**: Native Fetch API
   **Styling**: Tailwind CSS & ShadCN UI components
   **PWA**: `next-pwa` for service worker generation and manifest handling



## ☁️ Mock API

The application uses Next.js API Routes to simulate a backend. These API endpoints are defined in `src/app/api/notes/`:

*   `GET /api/notes`: Fetches all notes.
*   `POST /api/notes`: Creates a new note (can also handle upserts if an `id` is provided).
*   `PUT /api/notes/:id`: Updates an existing note.
*   `DELETE /api/notes/:id`: Deletes a note.

**Important**: The data for this mock API is stored **in-memory on the server-side** (`src/app/api/notes/store.ts`). This means it will be **reset if the server restarts**. For persistent storage in a real-world scenario, you'd replace this with a proper database.

## 🌐 Offline Functionality & Syncing Deep Dive

Markdown Notes Sync is built with an "offline-first" mindset:

1.  All your note operations (creating, editing, deleting) are first applied to the local IndexedDB. This ensures you can keep working without interruption, regardless of your internet connection.
2.  When the app detects an internet connection:
    *   It fetches the latest notes from the server.
    *   It pushes any local changes (new notes, updated notes, deleted notes) to the server.
    *   It pulls down any new or updated notes from the server that aren't yet reflected locally or are newer than the local synced version.
    *   A "last-write-wins" strategy is used for conflict resolution, primarily focusing on pushing unsynced local changes.

This robust synchronization ensures your data integrity across sessions and devices (if the backend were persistent and shared).




