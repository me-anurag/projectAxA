# AxA — Complete Codebase Documentation
### "Two Minds. One Mission."
**Version 1.0 | Written for any developer, at any point in time**

---

## TABLE OF CONTENTS

1. [What Is AxA?](#1-what-is-axa)
2. [Technology Stack — Why Each Tool Was Chosen](#2-technology-stack)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [The Two Users — How Identity Works](#4-the-two-users)
5. [Database — Every Table Explained](#5-database)
6. [Feature Breakdown — Every Feature, Where It Lives, How To Change It](#6-features)
   - 6.1 Onboarding
   - 6.2 Tasks (Missions)
   - 6.3 Subtasks
   - 6.4 Challenges
   - 6.5 Chat
   - 6.6 Workspace Views & Slide Navigation
   - 6.7 Sound System
   - 6.8 Push Notifications
   - 6.9 Daily AI Quotes
   - 6.10 AI Subtask Scanner (Coming Soon)
   - 6.11 Celebrations (Confetti)
   - 6.12 Side Panel & Settings
   - 6.13 Themes & Visual Identity
7. [Data Flow — How Everything Connects](#7-data-flow)
8. [Optimistic Updates — Why The UI Is Instant](#8-optimistic-updates)
9. [Realtime — How Live Sync Works](#9-realtime)
10. [PWA — How The App Installs On Phones](#10-pwa)
11. [Auto-Update — How The App Updates Without Cache Clearing](#11-auto-update)
12. [Every File Explained](#12-every-file-explained)
13. [Common Changes — Exactly Where To Go](#13-common-changes)
14. [Environment Variables](#14-environment-variables)
15. [Deployment](#15-deployment)
16. [How To Add A New Feature](#16-how-to-add-a-new-feature)
17. [Known Constraints](#17-known-constraints)

---

## 1. WHAT IS AXA?

AxA is a **private Progressive Web App (PWA)** built exclusively for two people: Anurag and Anshuman. It is installed on their phones like a native app and runs entirely offline-capable.

The core idea is a shared productivity and accountability space. Each user has their own **workspace** (their personal task board called "Missions"), they can **peek into each other's workspace** to see progress, **challenge each other**, **react and comment on each other's tasks** like Instagram, and **chat** in a private room.

**It is NOT a multi-user SaaS app.** There are exactly two users, hardcoded by name. This is intentional — the app is a personal tool, not a platform.

---

## 2. TECHNOLOGY STACK

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| UI Framework | React | 18.2 | Component model, hooks, fast dev |
| Build Tool | Create React App (react-scripts) | 5.0.1 | Zero-config PWA support with Workbox |
| Backend & Database | Supabase | 2.39.0 | PostgreSQL + realtime WebSockets + file storage in one service |
| Styling | Inline CSS (JS objects) | — | Theme values are JS variables — impossible to do with CSS files without CSS vars everywhere |
| Animation | CSS transitions + keyframes | — | 60fps, no library overhead for basic transitions |
| Date Handling | date-fns | 3.2.0 | Tree-shakeable, no moment.js bloat |
| Confetti | canvas-confetti | 1.9.2 | Lightweight, beautiful, async-loaded only on task completion |
| PWA Caching | Workbox (via CRA) | 7.0.0 | Service worker, offline cache, auto-update |
| Hosting | Vercel | — | Git-push deploys, free tier, global CDN |
| AI (quotes + future scanner) | Anthropic Claude API | claude-sonnet-4-20250514 | Generates daily motivational quotes and will power the AI subtask scanner |

**Why Supabase specifically?**
Supabase gives three things in one: a PostgreSQL database, a realtime WebSocket layer that broadcasts DB changes to connected clients, and file storage for uploaded images. This means zero need for a separate backend server, separate WebSocket server, or separate file hosting service. The entire backend is one Supabase project.

**Why inline CSS instead of CSS files or Tailwind?**
The app has two completely different color themes (Anurag blue, Anshuman fire) that switch based on who is logged in. Theme colors are stored as JavaScript objects in `theme.js`. If styles were in CSS files, you'd need CSS variables everywhere. With inline styles, you just do `color: theme.primary` and it works. This makes the theming system completely type-safe and easy to modify.

---

## 3. COMPLETE FOLDER STRUCTURE

```
axa-app/
│
├── public/                          ← Static files served as-is by the web server
│   ├── index.html                   ← The single HTML page (PWA meta tags live here)
│   ├── manifest.json                ← PWA install config (name, icons, theme color)
│   ├── icons/
│   │   ├── icon-192.jpg             ← App icon shown on phone home screen (192×192)
│   │   ├── icon-512.jpg             ← App icon for splash screen (512×512)
│   │   └── icon.svg                 ← SVG source for the AxA logo
│   └── sounds/
│       ├── startup.mp3              ← Plays when app opens (after login)
│       ├── notification.mp3         ← Plays when message/challenge arrives
│       └── levelup.mp3              ← Plays when a task is completed
│
├── src/                             ← All application source code
│   │
│   ├── App.jsx                      ← ROOT COMPONENT — the entire app lives here
│   ├── index.js                     ← React entry point — mounts App, registers SW
│   ├── serviceWorkerRegistration.js ← PWA service worker + auto-update logic
│   │
│   ├── lib/                         ← Pure utility modules (no UI, no React)
│   │   ├── supabase.js              ← Supabase client config + image upload utility
│   │   ├── theme.js                 ← User themes, status constants, VIEWS enum
│   │   ├── sounds.js                ← All sound functions (MP3 + Web Audio API)
│   │   └── celebrate.js             ← Confetti animation (async-loaded)
│   │
│   ├── hooks/
│   │   └── useData.js               ← ALL data hooks: tasks, challenges, messages, push
│   │
│   ├── pages/
│   │   └── Onboarding.jsx           ← First-time user selection screen
│   │
│   ├── components/                  ← Reusable UI components
│   │   ├── Navbar.jsx               ← Top bar with hamburger + AxA logo
│   │   ├── BottomBar.jsx            ← Bottom tab bar (Anurag | Chat | Anshuman)
│   │   ├── SidePanel.jsx            ← Hamburger drawer (settings, sound, quotes, logout)
│   │   ├── Workspace.jsx            ← Task board — the main content area
│   │   ├── TaskCard.jsx             ← Individual task card + Icon library
│   │   ├── CreateTaskModal.jsx      ← Slide-up form to create a new task
│   │   ├── ChallengeCard.jsx        ← Challenge display card with accept/decline
│   │   └── ChatScreen.jsx           ← Full-screen chat interface
│   │
│   ├── features/                    ← Self-contained feature modules
│   │   ├── ai-subtasks/             ← AI camera scanner for subtask generation
│   │   │   ├── AISubtaskScanner.jsx ← UI component (Coming Soon state currently)
│   │   │   ├── useAISubtasks.js     ← Claude vision API hook (implementation ready)
│   │   │   └── FEATURE_SPEC.md      ← Complete spec for when you build this out
│   │   └── daily-quotes/
│   │       └── DailyQuote.jsx       ← 6am overlay that fetches a quote from Claude API
│   │
│   └── styles/
│       └── global.css               ← CSS resets, animations, scrollbar, font-face
│
├── SUPABASE_SCHEMA.sql              ← Run this in Supabase SQL Editor to set up DB
├── AXA_DOCUMENTATION.md            ← This file
├── README.md                        ← Quick setup guide
├── .env.example                     ← Template for environment variables
└── package.json                     ← NPM dependencies and scripts
```

---

## 4. THE TWO USERS

**This is fundamental to understand before anything else.**

There are exactly two users, defined in `src/lib/theme.js`:

```
anurag   → theme: deep storm blue (#1a6fff), icon: ⚡ lightning
anshuman → theme: deep ember fire (#ff4d1a), icon: 🔥 fire
```

User identity is stored in `localStorage` under the key `axa_user`. The value is either the string `"anurag"` or `"anshuman"`. Nothing else. No passwords. No JWT. No email.

**Why no authentication?**
This app is used by exactly two known people on their personal phones. The "authentication" is knowing whose phone you're on. The Supabase RLS policies are set to `allow all` — both users can read and write everything, which is correct for a 2-person shared workspace.

**The user identity flows through the entire app:**
1. `localStorage.getItem('axa_user')` → `App.jsx` reads it on load
2. If null → shows `Onboarding.jsx` to pick a user
3. If set → loads the full app with that user's theme
4. All API calls use the user's name string as the `owner` or `sender` field
5. The theme object (`USERS[currentUser]`) is passed through props to every component that needs colors

**To add a third user (hypothetically):**
1. Add a new object to `USERS` in `theme.js`
2. Update the `check` constraints in `SUPABASE_SCHEMA.sql` to include the new name
3. Update the `BottomBar.jsx` — it currently shows exactly 3 buttons hardcoded

---

## 5. DATABASE

All data lives in a Supabase PostgreSQL database. The schema is in `SUPABASE_SCHEMA.sql`.

### Tables

#### `tasks`
The core data object. Every "Mission" Anurag or Anshuman creates.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, auto-generated |
| owner | text | Either `'anurag'` or `'anshuman'` — whose task this is |
| title | text | The mission title |
| description | text | Optional longer description |
| deadline | timestamptz | Optional due date/time |
| status | text | `'active'`, `'completed'`, or `'missed'` |
| image_urls | text[] | Array of Supabase Storage public URLs |
| created_at | timestamptz | When task was created |

#### `subtasks`
Checkbox items under a task. A task can have zero or many.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | FK → tasks.id (cascades on delete) |
| label | text | The subtask text |
| done | boolean | Whether it's checked |
| position | int | Sort order (0-indexed) |

#### `reactions`
Instagram-style emoji reactions left on a task by either user.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | FK → tasks.id |
| reactor | text | Who reacted (`'anurag'` or `'anshuman'`) |
| emoji | text | The emoji string |
| created_at | timestamptz | When reacted |

There's a `UNIQUE(task_id, reactor, emoji)` constraint — each user can only leave one of each emoji per task.

#### `comments`
Text comments left on a task.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | FK → tasks.id |
| author | text | Who commented |
| body | text | Comment text |
| created_at | timestamptz | When commented |

#### `challenges`
One user daring the other to complete something.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| from_user | text | Who sent the challenge |
| to_user | text | Who received it |
| title | text | What the challenge is |
| description | text | Optional extra detail |
| deadline | timestamptz | Optional due date |
| status | text | `'pending'`, `'accepted'`, `'completed'`, `'missed'`, `'declined'` |
| created_at | timestamptz | When sent |

#### `messages`
Private chat messages between the two users.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sender | text | Who sent it |
| body | text | Message text (nullable if image-only) |
| image_url | text | Supabase Storage URL (nullable if text-only) |
| created_at | timestamptz | When sent |

### Storage
There is one storage bucket: `task-images`. It stores both task attachment images (under `tasks/` prefix) and chat images (under `chat/` prefix). It is set to `public` — anyone with the URL can view the image.

### Realtime
All 6 tables have realtime enabled. This means any INSERT, UPDATE, or DELETE fires a WebSocket event to all connected clients instantly. This is how changes appear on both phones without refreshing.

---

## 6. FEATURES

### 6.1 Onboarding

**What it does:** First time a user opens the app, they see two large cards: one for Anurag and one for Anshuman. They tap their name, and that choice is saved to `localStorage` permanently. The app never asks again unless they log out.

**Where the code lives:** `src/pages/Onboarding.jsx`

**Where user identity is saved:** `localStorage.setItem('axa_user', userId)` — inside the `handleSelect` function in `Onboarding.jsx`, and also inside `App.jsx`'s `handleMenuItem` (for logout, which clears it).

**To change the welcome screen appearance:** Edit `Onboarding.jsx`. The card styles are in the `styles` object at the bottom of that file.

**To change what happens after selection:** The `onSelect` prop is a function passed from `App.jsx`. It calls `setCurrentUser(userId)` which updates React state and triggers the main app to render.

---

### 6.2 Tasks (Missions)

**What it does:** Each user can create tasks with a title, optional description, optional deadline, optional subtask checkboxes, and optional image attachments. Tasks have three states: active (in progress), completed (done), missed (deadline passed, locked).

**Where the code lives:**
- UI display: `src/components/TaskCard.jsx` — renders each individual task
- Task list + filters: `src/components/Workspace.jsx` — contains the Active/Done/Missed/History tabs
- Creation form: `src/components/CreateTaskModal.jsx` — the slide-up sheet
- Data logic: `src/hooks/useData.js` → `useTasks()` hook

**How creating a task works (step by step):**
1. User taps "+ Mission" button in `Workspace.jsx`
2. `showCreate` state becomes `true`, which renders `<CreateTaskModal />`
3. User fills in the form and taps "Launch Mission"
4. `handleSubmit` in `CreateTaskModal.jsx` calls `onSubmit(data)`
5. `onSubmit` is `handleCreate` in `Workspace.jsx`, which calls `createTask()` from `useTasks()`
6. `createTask()` in `useData.js` immediately adds an optimistic task to local state (UI updates instantly)
7. Then inserts to Supabase DB in the background
8. On success, replaces the temp task with the real DB record
9. The other user's realtime channel fires, they see the new task appear

**How task completion works:**
- If a task has NO subtasks: there's a checkbox button in the task card's main row. Tapping it calls `onToggleComplete()` → `toggleTaskComplete()` in `useData.js` → optimistically sets status to `'completed'` in local state immediately → writes to DB → triggers confetti + level up sound.
- If a task HAS subtasks: the main checkbox is hidden. Completion is automatic when ALL subtasks are checked. Each subtask check calls `toggleSubtask()` which checks if all done, then auto-completes the parent task.

**How missed tasks work:**
A `setInterval` in the `useTasks` hook runs every 60 seconds. It looks at all active tasks with a deadline. If the deadline is in the past, it updates the task status to `'missed'` in the DB and locally. Missed tasks turn red, have strikethrough text, and cannot be edited.

**How task deletion works:**
The trash icon on each card shows a confirm prompt ("Delete" / "No"). On confirm, `deleteTask()` in `useData.js` first removes the task from local state (instant), then deletes comments, reactions, and subtasks from DB (in that order, to avoid FK constraint errors), then deletes the task itself.

**To change the task card appearance:** Edit `TaskCard.jsx`. All styles are in the `S` object at the bottom.

**To add a new field to tasks (e.g. "priority"):**
1. Add the column to `SUPABASE_SCHEMA.sql` and run ALTER TABLE in Supabase SQL editor
2. Add the field to the form in `CreateTaskModal.jsx`
3. Pass it in the `createTask()` call in `useData.js`
4. Display it in `TaskCard.jsx`

---

### 6.3 Subtasks

**What it does:** Any task can have an ordered list of checkbox subtasks. When created, they appear expanded by default so the user sees them immediately. Progress is shown as a fraction (e.g. "2/4") in the task card header and as a thin colored bar at the top of the card.

**Where the code lives:**
- Display and checkbox logic: `TaskCard.jsx` — the `subtaskList` section inside the expanded body
- Creation: `CreateTaskModal.jsx` — the subtask input field with the + button
- Data: `useData.js` → `useTasks()` → `toggleSubtask()` function
- DB table: `subtasks` in Supabase

**Why subtasks are expanded by default:**
```js
const [expanded, setExpanded] = useState(hasSubtasks);
```
The initial state is `true` if the task has subtasks. This means when the task list loads, any task with subtasks is already showing its checklist — no tap required.

**To change how many subtasks are visible before needing to scroll:** The subtask list has no max-height limit currently. You could add `maxHeight: '200px', overflowY: 'auto'` to the `subtaskList` style in `TaskCard.jsx` if you want to cap it.

---

### 6.4 Challenges

**What it does:** Either user can challenge the other. A challenge has a title, optional description, optional deadline, and goes through states: pending → accepted/declined → completed/missed.

**The flow:**
1. Sender taps the sword icon in their Workspace header → `SendChallengePanel` appears
2. They fill in the title and tap "Send Challenge"
3. The challenge is saved to DB. The receiver sees it instantly (realtime) in their Workspace's "Challenges" tab with a notification bar at the top saying "X challenges waiting"
4. Receiver can Accept or Decline
5. If Accepted, it shows in the Active view for the receiver to mark Complete

**The history tab:** In the Challenges view, there's a "History" sub-filter that shows all completed, missed, and declined challenges — the full record.

**Where the code lives:**
- The challenge view/filters inside workspace: `Workspace.jsx` — the `mainView === 'challenges'` section
- The challenge card UI: `ChallengeCard.jsx`
- The send panel UI: `SendChallengePanel` function inside `Workspace.jsx`
- Data: `useData.js` → `useChallenges()` hook
- State: `App.jsx` → `challenges` array passed down as props

**To add more challenge statuses:** Update the `status` CHECK constraint in `SUPABASE_SCHEMA.sql`, add the new status to `STATUS_CONFIG` in `ChallengeCard.jsx`, and handle it in `Workspace.jsx` filters.

---

### 6.5 Chat

**What it does:** A full-screen private chat screen. Text messages and image messages. Messages appear instantly (optimistic UI). Date separators. Sent messages show a subtle "Sending..." label until confirmed by DB.

**Where the code lives:** `src/components/ChatScreen.jsx`
**Data hook:** `useData.js` → `useMessages()`

**How optimistic send works:**
1. User taps send
2. Input is cleared immediately
3. A temp message with `_sending: true` is added to local state — appears in chat instantly with opacity 0.7
4. DB insert happens in background
5. When confirmed, temp message is replaced with real DB record, opacity goes to 1

**How the other user sees new messages:**
The `useMessages` hook subscribes to Supabase realtime `INSERT` events on the `messages` table. When a new row is inserted by the sender's DB write, the channel fires for the other user, and their message list state is updated directly.

**The "Coming Soon" banner:** There is a banner in the old ChatScreen that said "Chat — Coming Soon." In the current version this has been removed. The banner code was in the original `ChatScreen.jsx`. If you need to add a "feature coming" banner anywhere, the pattern is a simple `<div>` with a `background: linear-gradient(...)` from the user's theme.

**To change the chat bubble appearance:** Edit the `bubble`, `bubbleText`, `bubbleMeta` styles in the `S` object at the bottom of `ChatScreen.jsx`.

---

### 6.6 Workspace Views & Slide Navigation

**What it does:** The bottom bar has three buttons: [Anurag] [Chat] [Anshuman]. Tapping a button slides the view:
- Anurag button → own workspace slides from the left
- Anshuman button → other workspace slides from the right  
- Chat button → chat screen slides up from bottom

This is all done with CSS `transform: translateX()` on absolutely positioned full-screen divs.

**Where the code lives:**
- Navigation state: `App.jsx` — `activeView` state + `VIEWS` enum from `theme.js`
- The three panes: `App.jsx` — the `viewContainer` div and its three children
- The bottom buttons: `BottomBar.jsx`
- The `VIEWS` constant: `theme.js` → `export const VIEWS = { OWN, OTHER, CHAT }`

**How the slide transition works:**
```jsx
transform: activeView === VIEWS.OWN ? 'translateX(0)' : 'translateX(-100%)'
transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)'
```
The own workspace pane slides left when not active. The other workspace pane is positioned at `translateX(100%)` (off-screen right) when not active. Chat uses `slideInUp` CSS animation.

**To change the slide speed:** Edit the transition duration `0.32s` in `App.jsx` viewPane styles.

**The `ownerUser` vs `viewerUser` distinction:**
Every `Workspace` component receives both `ownerUser` (whose tasks are shown) and `viewerUser` (who is looking). When `viewerUser !== ownerUser`, the workspace is in "spectator" mode — no create button, no delete, no edit, but can still react and comment on tasks.

---

### 6.7 Sound System

**What it does:** Plays sounds on key interactions. All sounds respect a global on/off toggle stored in `localStorage`.

**Where the code lives:** `src/lib/sounds.js`
**Sound files:** `public/sounds/startup.mp3`, `notification.mp3`, `levelup.mp3`

**How the toggle works:**
- `isSoundEnabled()` → reads `localStorage.getItem('axa_sound')` (default: true)
- `setSoundEnabled(val)` → writes to localStorage
- Every sound function checks `if (!isSoundEnabled()) return` before playing
- The toggle UI is in `SidePanel.jsx`

**Sound map:**
| Trigger | Sound | Type |
|---------|-------|------|
| App opens | `startup.mp3` | MP3 file |
| Task completed | `levelup.mp3` | MP3 file |
| New message/challenge arrives | `notification.mp3` | MP3 file |
| Subtask checkbox ticked | Web Audio tone (1046 Hz sine) | Generated |
| Button click | Web Audio tone (820 Hz square) | Generated |
| Task deadline missed | Web Audio descending tones | Generated |

**To replace a sound:** Drop a new `.mp3` file in `public/sounds/` with the same filename, push to Git.

**To add a new sound trigger:**
1. Add `playYourSound()` function to `sounds.js`
2. Import it in the component where it should fire
3. Call it at the right moment

---

### 6.8 Push Notifications

**What it does:** Sends an OS-level notification popup to the phone when a new message or challenge arrives. Works like WhatsApp — the notification appears even when the app is minimised.

**Where the code lives:** `useData.js` → `usePushNotifications()` hook, called from `App.jsx`

**How it works technically:**
1. On app load, `Notification.requestPermission()` is called — the browser shows "Allow notifications?" to the user
2. Two Supabase realtime channels are subscribed:
   - `push_msg_{currentUser}` — watches for new rows in `messages` table
   - `push_chall_{currentUser}` — watches for new rows in `challenges` table
3. When a new message/challenge arrives from the OTHER user, `sendPush()` is called
4. `sendPush()` calls `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))`
5. The service worker fires the OS notification — this works even when the browser tab is not in focus

**Platform reality:**
- **Android (Chrome):** Works fully including when screen is off (service worker stays alive)
- **iOS (Safari, installed as PWA, iOS 16.4+):** Works when app is minimised
- **iOS (browser tab, not installed):** Does NOT work — Apple's restriction

**To change what the notification says:** Edit `sendPush()` calls in `usePushNotifications()` in `useData.js`. The title and body are plain strings.

**To add more notification triggers (e.g. task completed by other user):** Add a new Supabase realtime subscription in `usePushNotifications()` watching the relevant table/event, and call `sendPush()`.

---

### 6.9 Daily AI Quotes

**What it does:** Every day at 6am, a full-screen overlay appears with a motivational quote generated by Claude AI, personalised to the user's name. It shows once per day and can be dismissed. Can be turned off in Settings.

**Where the code lives:** `src/features/daily-quotes/DailyQuote.jsx`
**Called from:** `App.jsx` — `{quotesOn && <DailyQuote user={currentUser} />}`
**Toggle state:** `quotesOn` in `App.jsx`, stored as `'axa_quotes'` in `localStorage`

**How the 6am trigger works:**
A `setInterval` runs every 60 seconds inside `DailyQuote.jsx`. Each tick checks:
1. Is `new Date().getHours() >= 6`?
2. Has today's quote already been shown? (checks `localStorage.getItem('axa_daily_quote')` for today's date)
3. If not shown today and it's after 6am → fetch quote and show overlay

**How the quote is fetched:**
```js
fetch('https://api.anthropic.com/v1/messages', {
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: `Give me one short motivational quote for ${userName}...` }]
})
```
The response is expected to be a JSON object: `{"quote": "...", "author": "..."}`. The fetched quote is cached in `localStorage` for the day so it doesn't re-fetch if the app is reopened.

**To change the prompt / quote style:** Edit the `prompt` string inside `fetchDailyQuote()` in `DailyQuote.jsx`.

**To change the time quotes appear:** Change `hour >= 6` to any other hour.

**To change the quote overlay appearance:** Edit the `styles` object at the bottom of `DailyQuote.jsx`.

---

### 6.10 AI Subtask Scanner (Coming Soon)

**What it does (when enabled):** User photographs a handwritten task list → Claude vision API extracts each line → Subtask checkboxes are auto-populated in the Create Mission form → User can edit before saving.

**Current state:** The UI is visible in `CreateTaskModal.jsx` with a "Coming Soon" badge and a disabled button.

**Where the code lives:**
- UI placeholder: `src/features/ai-subtasks/AISubtaskScanner.jsx`
- API hook (fully written, not wired up yet): `src/features/ai-subtasks/useAISubtasks.js`
- Full spec: `src/features/ai-subtasks/FEATURE_SPEC.md`

**To enable this feature:**
1. In `AISubtaskScanner.jsx`, remove `disabled` from the button and `cursor: 'not-allowed'` from its style
2. Import `useAISubtasks` hook
3. Wire the camera file input to call `scan(imageFile)` from the hook
4. Show a loading state, then display the returned subtask list as editable chips
5. Wire the "Use These Tasks" button to call `onSubtasksGenerated(items)`

---

### 6.11 Celebrations (Confetti)

**What it does:** When a task reaches 100% completion, a confetti explosion fires using the user's theme colors (blue for Anurag, fire orange for Anshuman).

**Where the code lives:** `src/lib/celebrate.js`
**Called from:** `useData.js` → `toggleSubtask()` and `toggleTaskComplete()` when status becomes `completed`

**How it's loaded:**
```js
const confetti = (await import('canvas-confetti')).default;
```
The `canvas-confetti` library is loaded dynamically (async import) so it doesn't bloat the initial app bundle. It only loads the first time a task is completed.

**To change confetti colors:** Edit the `colors` arrays in `celebrate.js`. Anurag's colors use blue shades, Anshuman's use fire orange/red.

---

### 6.12 Side Panel & Settings

**What it does:** A drawer that slides in from the left when the hamburger icon is tapped. Contains navigation (Syllabus, Breathing — coming soon), settings (sound toggle, daily quotes toggle), and logout.

**Where the code lives:** `src/components/SidePanel.jsx`
**Props it receives from `App.jsx`:**
- `open` — whether drawer is visible
- `onClose` — function to close it
- `user` — current user string
- `onMenuItem` — callback for navigation items (logout)
- `soundOn` / `onToggleSound` — sound setting
- `quotesOn` / `onToggleQuotes` — quotes setting

**To add a new menu item:**
1. Add a new `MenuItem` component call in `SidePanel.jsx`
2. If it's a setting with on/off, use `ToggleItem`
3. If it navigates somewhere, handle it in `onMenuItem` in `App.jsx`

**The toggle pill component** is defined as `ToggleItem` inside `SidePanel.jsx`. It's a div with two styles: a track that changes background color, and a thumb that uses `transform: translateX()` to slide.

---

### 6.13 Themes & Visual Identity

**This is one of the most important architectural decisions in the codebase.**

All colors, gradients, and spacing tokens for both users live in one place: `src/lib/theme.js`.

**Anurag's theme object:**
```js
{
  id: 'anurag',
  primary: '#1a6fff',      // Main accent color (buttons, highlights)
  bg: '#0a0f1e',           // App background (deepest dark)
  surface: '#0d1628',      // Card/panel background
  surfaceHigh: '#111e3a',  // Input field background (slightly lighter)
  border: 'rgba(26, 111, 255, 0.2)',    // Subtle borders
  borderHigh: 'rgba(26, 111, 255, 0.5)', // Focused/active borders
  text: '#e8f4ff',         // Primary text
  textMuted: 'rgba(232, 244, 255, 0.5)', // Placeholder/secondary text
  btnGradient: 'linear-gradient(135deg, #1a6fff, #0040cc)', // All gradient buttons
  glow: 'rgba(26, 111, 255, 0.5)', // Box shadows, glows
}
```

**To change Anurag's color scheme:** Edit only the `anurag` object in `theme.js`. Everything — cards, buttons, navbar, bottom bar, confetti, task progress bar — will update automatically because every component reads from this object.

**The Icon component:**
All SVG icons in the app are defined in a single `Icon` component exported from `TaskCard.jsx`. This was placed there for historical reasons (it was the first component to need custom icons). The `Icon` component is imported by `BottomBar.jsx`, `SidePanel.jsx`, `ChallengeCard.jsx`, `CreateTaskModal.jsx`, `Workspace.jsx`, `ChatScreen.jsx`, and `features/ai-subtasks/AISubtaskScanner.jsx`.

**To add a new icon:**
1. Find a Feather-style SVG path for your icon
2. Add it to the `icons` object inside the `Icon` function in `TaskCard.jsx`
3. Use it anywhere: `<Icon name="yourIconName" size={16} color={theme.primary} />`

---

## 7. DATA FLOW

Here is the complete path of data from user action to screen, for the most common operation — creating a task:

```
User taps "+ Mission"
    ↓
Workspace.jsx: setShowCreate(true)
    ↓
CreateTaskModal renders
    ↓
User fills form, taps "Launch Mission"
    ↓
CreateTaskModal.handleSubmit()
    ↓
Calls onSubmit(formData)  [prop from Workspace]
    ↓
Workspace.handleCreate()
    ↓
Calls createTask(data)  [from useTasks hook]
    ↓
useData.js: createTask()
    ├── IMMEDIATELY: adds optimistic task to local tasks[] state
    │   → React re-renders → TaskCard appears on screen instantly
    ├── Uploads images to Supabase Storage (if any)
    ├── Inserts task row to Supabase DB
    ├── Inserts subtask rows to Supabase DB
    └── Replaces temp task with real DB record in local state
            ↓
    Supabase realtime fires INSERT event on tasks table
            ↓
    Other user's useTasks hook receives the event
            ↓
    fetchTasks() runs on other device
            ↓
    Other user's screen updates with the new task
```

---

## 8. OPTIMISTIC UPDATES

**This is why the app feels instant.**

Every single mutation in the app uses optimistic updates. This means: the UI changes BEFORE the database write completes. If the write fails, it rolls back.

**The pattern, used everywhere:**

```js
// 1. Update local state immediately
setTasks(prev => prev.map(t =>
  t.id === task.id ? { ...t, status: 'completed' } : t
));

// 2. Trigger UI feedback (sound, confetti) immediately
celebrate(userTheme);
playSuccess();

// 3. Write to DB in background
await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
// If this fails, a re-fetch would restore truth — but it rarely fails
```

**Applied to:**
- `createTask` — task appears in list immediately with a temp ID
- `toggleSubtask` — checkbox changes state immediately
- `toggleTaskComplete` — status changes immediately
- `deleteTask` — card disappears immediately
- `sendMessage` — message appears in chat immediately with "Sending..." opacity
- `sendChallenge` — challenge appears immediately
- `updateChallengeStatus` — status pill changes immediately
- `toggleReaction` — emoji button highlights immediately
- `addComment` — comment appears immediately

---

## 9. REALTIME

**How the live sync between the two phones works.**

Supabase Realtime is a WebSocket layer on top of PostgreSQL. When any row is inserted, updated, or deleted in a table that has realtime enabled, Supabase broadcasts that change to all connected clients who have subscribed to that table.

**The subscription pattern (from `useData.js`):**

```js
const ch = supabase
  .channel('tasks_rt_anurag')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'tasks', filter: 'owner=eq.anurag' },
    () => fetchRef.current?.()  // re-fetches all tasks
  )
  .subscribe();
```

**The `fetchRef` pattern — why it's critical:**
React's `useCallback` creates a new function identity whenever its dependencies change. If the `fetchTasks` function was passed directly to the realtime callback and used in the dependency array of `useEffect`, the channel would unsubscribe and resubscribe every time `fetchTasks` changed identity — which would be constantly, causing the subscription to always be in a reconnecting state.

The fix: store `fetchTasks` in a `ref`:
```js
const fetchRef = useRef(null);
fetchRef.current = fetchTasks;  // Updated every render, no effect dependency
```
Now the `useEffect` only runs when `owner` changes (i.e., once), but the callback always calls the latest version of `fetchTasks`.

**Channel naming convention:**
All channels are named `{table}_rt_{scope}` (e.g., `tasks_rt_anurag`, `social_rt_{taskId}`). The `_rt_` middle part makes them easy to identify in Supabase's realtime inspector. Using a versioned suffix like `_v2` was used in earlier iterations to force new channel creation when debugging — this has been cleaned up.

---

## 10. PWA

**How the app installs on phones.**

A Progressive Web App installs via the browser's "Add to Home Screen" feature. Once installed, it runs in standalone mode — no browser chrome, full screen, appears in the app switcher like a native app.

**The three pieces that make it installable:**

1. **`public/manifest.json`** — tells the browser the app's name, icons, and display mode:
```json
{
  "name": "AxA — Two Minds. One Mission.",
  "display": "standalone",
  "start_url": "/",
  "icons": [{ "src": "icons/icon-192.jpg", ... }]
}
```

2. **`public/index.html`** — has Apple-specific meta tags:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.jpg" />
```

3. **Service Worker** — registered by `serviceWorkerRegistration.js`, handles caching so the app works offline.

**To update the app icon:** Replace `public/icons/icon-192.jpg` and `icon-512.jpg` with new images. They must be at least 192×192 and 512×512 pixels respectively. Push to Git, Vercel deploys, next app open the new icon is used.

---

## 11. AUTO-UPDATE

**Why you never need to manually clear cache when code changes are deployed.**

The service worker in `serviceWorkerRegistration.js` polls for updates every 60 seconds:
```js
setInterval(() => { registration.update(); }, 60 * 1000);
```

When Vercel deploys a new version, the service worker file hash changes. On the next poll, the browser detects the new version and starts installing it. When installed, it immediately calls `skipWaiting()` to take control, then the `controllerchange` event fires, which calls `window.location.reload()`.

**For the user:** They push changes to GitHub → Vercel builds → within 60 seconds of either user opening the app → it silently refreshes to the new version. No banners, no "Update Available" dialogs, no manual action.

---

## 12. EVERY FILE EXPLAINED

### Root files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies. Add new libraries here. |
| `.env.example` | Template. Copy to `.env.local` and fill in Supabase keys. Never commit `.env.local`. |
| `SUPABASE_SCHEMA.sql` | Run in Supabase SQL Editor to create DB tables. Re-run sections to add new tables. |
| `AXA_DOCUMENTATION.md` | This file. |
| `README.md` | Quick start guide. |

### `public/`

| File | Purpose |
|------|---------|
| `index.html` | Single HTML entry point. Edit meta tags here (title, theme color, apple icons). |
| `manifest.json` | PWA install configuration. Edit app name, icon paths, theme color here. |
| `icons/icon-192.jpg` | Home screen icon (small). Replace to change app icon. |
| `icons/icon-512.jpg` | Splash screen icon (large). Replace to change app icon. |
| `sounds/startup.mp3` | Plays on app open. Replace to change startup sound. |
| `sounds/notification.mp3` | Plays on incoming message/challenge. Replace to change. |
| `sounds/levelup.mp3` | Plays on task completion. Replace to change. |

### `src/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `index.js` | React app entry point. Mounts App, registers service worker. | Rarely. Only if adding global providers (Context, Redux). |
| `App.jsx` | The root component. Manages: current user identity, active view (own/other/chat), side panel open state, sound setting, quotes setting. Renders everything. | When adding new global state, new top-level routes, or new settings. |
| `serviceWorkerRegistration.js` | PWA service worker registration + auto-update logic. | Only if changing update behavior. |
| `styles/global.css` | CSS resets, font imports (Syne, DM Sans, Space Mono), animation keyframes (fadeIn, slideInUp, etc.), scrollbar styling. | When adding new CSS animations or changing fonts. |

### `src/lib/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `supabase.js` | Creates the Supabase client with realtime config. Exports `supabase` (the client) and `uploadImage()`. | When changing Supabase project, adding storage buckets, or modifying realtime settings. |
| `theme.js` | The single source of truth for colors, VIEWS enum, TASK_STATUS enum, CHALLENGE_STATUS enum, REACTION_EMOJIS array. | When changing colors, adding a new status, or adding new reaction emojis. |
| `sounds.js` | All sound functions. MP3 playback + Web Audio API tones. Sound enable/disable. | When adding new sound triggers, replacing MP3s, or changing tone frequencies. |
| `celebrate.js` | Confetti animation. Async-loads canvas-confetti. Uses user theme colors. | When changing confetti behavior or adding new celebration effects. |

### `src/hooks/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `useData.js` | ALL data logic. Contains: `useTasks()`, `useTaskSocial()`, `useChallenges()`, `useMessages()`, `usePushNotifications()`. Handles optimistic updates, realtime subscriptions, and Supabase CRUD. | When adding new database operations, changing query structure, adding new tables, or changing realtime subscription scope. |

### `src/pages/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `Onboarding.jsx` | The user selection screen shown on first open. | When changing the welcome screen design or adding setup steps. |

### `src/components/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `Navbar.jsx` | Top bar. Shows hamburger (left) and AxA logo (right). | When changing navbar layout, adding notification badges, or modifying the logo. |
| `BottomBar.jsx` | Three-tab bottom navigation. Renders own user button (left), chat button (center), other user button (right). | When changing tab layout, adding tabs, or modifying the active state visuals. |
| `SidePanel.jsx` | Slide-in drawer from left. Menu items, sound toggle, quotes toggle, logout. Also exports `VolumeIcon` and `QuoteIcon`. | When adding new settings, new navigation items, or changing drawer appearance. |
| `Workspace.jsx` | The main task board. Two top-level views (tasks / challenges), filter tabs, task list, challenge list, send challenge panel. | When adding new filters, changing the workspace header, or modifying task/challenge grouping. |
| `TaskCard.jsx` | Individual task card. Expanded/collapsed state, subtask checkboxes, progress bar, reactions, comments, delete confirm. ALSO exports the `Icon` component used everywhere. | When changing task card layout, adding new task fields, or adding new icons to the Icon library. |
| `CreateTaskModal.jsx` | Slide-up form for creating a new task. Title, description, deadline, subtasks, image attachments, AI scanner section. | When adding new task fields or changing the creation form. |
| `ChallengeCard.jsx` | Challenge display. Shows from/to users, status pill, accept/decline/complete buttons. | When changing challenge card layout or adding new challenge actions. |
| `ChatScreen.jsx` | Full-screen chat. Message list with date separators, image attachments, optimistic send, auto-scroll. | When adding chat features (reactions to messages, message deletion, typing indicators). |

### `src/features/`

| File | Purpose | When To Edit |
|------|---------|--------------|
| `ai-subtasks/AISubtaskScanner.jsx` | The "Coming Soon" UI placeholder in the Create Task modal. | When enabling the AI scanner — remove `disabled`, wire up `useAISubtasks`. |
| `ai-subtasks/useAISubtasks.js` | The complete Claude vision API hook. Ready to use. | When enabling the feature or changing the AI prompt. |
| `ai-subtasks/FEATURE_SPEC.md` | Full spec for the AI scanner. | Read this before implementing. |
| `daily-quotes/DailyQuote.jsx` | The 6am motivational quote overlay. Fetches from Claude API, caches in localStorage. | When changing quote timing, appearance, or the AI prompt. |

---

## 13. COMMON CHANGES — EXACTLY WHERE TO GO

| I want to... | Go to this file | Change this |
|-------------|-----------------|-------------|
| Change Anurag's color scheme | `src/lib/theme.js` | `USERS.anurag.primary`, `.bg`, `.surface`, etc. |
| Change Anshuman's color scheme | `src/lib/theme.js` | `USERS.anshuman.primary`, `.bg`, `.surface`, etc. |
| Replace the startup sound | `public/sounds/startup.mp3` | Replace the file (keep the same name) |
| Replace the task completion sound | `public/sounds/levelup.mp3` | Replace the file |
| Replace the notification sound | `public/sounds/notification.mp3` | Replace the file |
| Change the app icon | `public/icons/icon-192.jpg` and `icon-512.jpg` | Replace both files |
| Change the app name shown on home screen | `public/manifest.json` | `"name"` and `"short_name"` fields |
| Add a new task field (e.g. priority) | `SUPABASE_SCHEMA.sql` + `src/hooks/useData.js` + `src/components/CreateTaskModal.jsx` + `src/components/TaskCard.jsx` | Add DB column, add to form, add to createTask call, display in card |
| Change when daily quotes appear | `src/features/daily-quotes/DailyQuote.jsx` | `hour >= 6` — change the number |
| Change the daily quote AI prompt | `src/features/daily-quotes/DailyQuote.jsx` | The `prompt` string in `fetchDailyQuote()` |
| Enable the AI subtask scanner | `src/features/ai-subtasks/AISubtaskScanner.jsx` | Remove `disabled` prop, wire up `useAISubtasks` |
| Add a new side panel menu item | `src/components/SidePanel.jsx` | Add a `MenuItem` or `ToggleItem` call |
| Add a new emoji reaction | `src/lib/theme.js` | `REACTION_EMOJIS` array |
| Change challenge statuses | `SUPABASE_SCHEMA.sql` + `src/components/ChallengeCard.jsx` | Add to DB CHECK, add to `STATUS_CONFIG` |
| Add a new icon | `src/components/TaskCard.jsx` | Add to the `icons` object inside the `Icon` function |
| Change the bottom bar layout | `src/components/BottomBar.jsx` | The three button components |
| Change how the chat bubbles look | `src/components/ChatScreen.jsx` | `S.bubble`, `S.bubbleText` style objects |
| Add a new notification trigger | `src/hooks/useData.js` | Add a new Supabase subscription inside `usePushNotifications()` |
| Change the slide transition speed | `src/App.jsx` | `transition: 'transform 0.32s...'` in viewPane styles |
| Make tasks NOT expanded by default | `src/components/TaskCard.jsx` | `useState(hasSubtasks)` → `useState(false)` |
| Change confetti colors | `src/lib/celebrate.js` | The `colors` arrays |

---

## 14. ENVIRONMENT VARIABLES

The app needs exactly two environment variables, stored in `.env.local` (never committed to Git):

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get them:** Supabase dashboard → Project Settings → API → Project URL and anon/public key.

**On Vercel:** Go to your Vercel project → Settings → Environment Variables → add both variables there. Vercel injects them at build time.

**Important:** Variables must start with `REACT_APP_` to be accessible in the browser. This is a Create React App convention. Variables without this prefix are only available server-side and will be `undefined` in the browser.

---

## 15. DEPLOYMENT

### First deployment
```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# 3. Set up database
# Open Supabase SQL Editor, paste SUPABASE_SCHEMA.sql, run it

# 4. Test locally
npm start

# 5. Deploy
# Connect GitHub repo to Vercel, add env vars in Vercel dashboard
# Push to main branch — Vercel deploys automatically
```

### Every subsequent deployment
```bash
git add .
git commit -m "your change description"
git push
# Vercel detects the push and deploys automatically
# Within ~2 minutes, both phones get the update automatically (60s SW poll)
```

### Installing on phones
**Android:** Open the app URL in Chrome → three-dot menu → "Add to Home Screen"  
**iOS:** Open in Safari → Share button → "Add to Home Screen"  
The app will then appear with the AxA icon and run full-screen.

---

## 16. HOW TO ADD A NEW FEATURE

Follow this checklist for any new feature:

**Step 1: Does it need new data?**
- Yes → Add table(s) to `SUPABASE_SCHEMA.sql`, run ALTER TABLE or create table in Supabase SQL editor
- Add the new table to `alter publication supabase_realtime add table your_table;`

**Step 2: Does it need API calls?**
- Add a new hook in `src/hooks/useData.js` following the existing pattern
- Use the optimistic update pattern: update local state first, then write to DB
- Use the `fetchRef` pattern for stable realtime subscriptions

**Step 3: Is it a self-contained feature?**
- Yes (like daily quotes, AI scanner) → Create a folder in `src/features/yourfeature/`
- No (like a new field on tasks) → modify the existing component

**Step 4: Does it need new UI?**
- New screen → add to `src/pages/`
- Reusable widget → add to `src/components/`
- Feature-specific → add to `src/features/yourfeature/`

**Step 5: Does it need a new setting?**
- Add toggle state to `App.jsx`
- Save to `localStorage` with a key like `axa_yourfeature`
- Pass state and toggle function as props to `SidePanel.jsx`
- Add a `ToggleItem` in `SidePanel.jsx`

**Step 6: Does it need a new sound?**
- Add MP3 to `public/sounds/`
- Add `playYourSound()` to `sounds.js`
- Import and call it at the right moment

**Step 7: Does it need DB changes?**
- Modify `SUPABASE_SCHEMA.sql` for documentation
- Run the actual SQL in the Supabase SQL Editor

---

## 17. KNOWN CONSTRAINTS

| Constraint | Why | How to solve if needed |
|-----------|-----|----------------------|
| Exactly 2 users | Hardcoded in DB constraints and theme.js | Update `check` constraints in SQL schema, add user to `USERS` in theme.js, update BottomBar |
| iOS background push requires iOS 16.4+ and PWA install | Apple OS restriction | Cannot be bypassed without a native app on the App Store |
| No user passwords | This is a personal private app, authentication was consciously omitted | Add Supabase Auth if you ever want real login |
| Images stored on Supabase (5GB free tier) | Free plan limit | Upgrade Supabase plan or add image compression before upload |
| Daily quotes require Claude API calls from the browser | The API key is in the request | For a truly private app this is fine; for public apps, proxy through a backend |
| AI subtask scanner disabled | Not yet wired up | Follow the steps in `FEATURE_SPEC.md` |
| Breathing feature not implemented | Planned for future | Create `src/features/breathing/` folder and implement guided breathing animations |
| Syllabus feature not implemented | Planned for future | Create `src/features/syllabus/` folder — likely needs a new DB table |

---

*This documentation was written to be complete, permanent, and unambiguous. If you are reading this years from now and something doesn't match what you see in the code, trust the code and update this document.*

*AxA — Two Minds. One Mission.*
