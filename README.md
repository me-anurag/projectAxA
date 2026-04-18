# AxA — Two Minds. One Mission. ⚡🔥

A private real-time PWA for Anurag⚡ and Anshuman🔥.

---

## 🚀 Quick Setup (15 minutes)

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Choose a region close to you (e.g., Asia South → Mumbai)
3. Wait for project to provision (~2 min)

### Step 2 — Run the Database Schema

1. In your Supabase dashboard → **SQL Editor**
2. Paste the entire contents of `SUPABASE_SCHEMA.sql`
3. Click **Run** — this creates all tables, enables realtime, and sets up storage

### Step 3 — Get your API Keys

1. Go to **Project Settings → API**
2. Copy:
   - `Project URL` → `REACT_APP_SUPABASE_URL`
   - `anon public key` → `REACT_APP_SUPABASE_ANON_KEY`

### Step 4 — Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### Step 5 — Install & Run

```bash
npm install
npm start
```

### Step 6 — Deploy as PWA

```bash
npm run build
# Deploy `build/` folder to:
# - Vercel (recommended): vercel --prod
# - Netlify: netlify deploy --prod --dir=build
# - Firebase Hosting: firebase deploy
```

### Step 7 — Install on phones

1. Open the deployed URL on both phones
2. **iOS**: Share → Add to Home Screen
3. **Android**: Menu → Install App / Add to Home Screen

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── supabase.js        # Supabase client + image upload
│   ├── theme.js           # User themes (⚡ blue / 🔥 fire)
│   ├── sounds.js          # Web Audio API sound effects
│   └── celebrate.js       # Confetti celebrations
├── hooks/
│   └── useData.js         # All real-time data hooks
├── pages/
│   └── Onboarding.jsx     # First-time user selection
├── components/
│   ├── Navbar.jsx         # Top nav with AxA logo + hamburger
│   ├── BottomBar.jsx      # Anurag | Chat | Anshuman tabs
│   ├── SidePanel.jsx      # Hamburger drawer menu
│   ├── Workspace.jsx      # Task list with filters
│   ├── TaskCard.jsx       # Individual task with subtasks + social
│   ├── CreateTaskModal.jsx # New task creation sheet
│   ├── ChallengeCard.jsx  # Challenge display + actions
│   └── ChatScreen.jsx     # Full-screen chat
├── styles/
│   └── global.css         # Design tokens + animations
├── App.jsx                # Root with view transitions
└── index.js               # PWA entry point
```

---

## ✨ Features

### Tasks ("Missions")
- Title, description, deadline, subtasks (checkboxes), image attachments
- Auto-miss detection — tasks past deadline turn red and lock
- Completion celebration — confetti + arcade sounds when 100% done
- Filters: Active | Done | Missed | History (date-grouped timeline)
- Real-time sync — both users see changes instantly

### Dual Workspaces
- Bottom bar: `[Anurag⚡] [💬] [Anshuman🔥]`
- Tap own name → own workspace slides from left
- Tap other name → their workspace slides from right
- View other's progress, react (8 emojis), comment on tasks

### Challenges ⚔️
- Send challenges to each other with title, description, deadline
- Receive → Accept / Decline
- Accepted → shows in active view
- Mark complete with celebration

### Chat 💬
- Real-time messaging with image sharing
- Date separators, timestamps
- "Coming Soon" banner for upcoming features

### User Themes
- **Anurag⚡** — Deep storm blue, lightning aesthetic
- **Anshuman🔥** — Deep ember, fire aesthetic
- Each user gets their own color scheme applied globally when they log in

### PWA
- Installable on iOS and Android
- Offline-capable (cached shell)
- Full-screen standalone mode

---

## 🛠 Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 | Component model, fast dev |
| Styling | CSS-in-JS (inline) | Zero build config, theme-safe |
| Fonts | Syne + DM Sans + Space Mono | Distinctive, non-generic |
| Animation | CSS transitions + keyframes | 60fps, no library overhead |
| Real-time | Supabase Realtime (WebSockets) | <100ms sync, zero config |
| Database | Supabase (PostgreSQL) | Relational, RLS, realtime |
| Storage | Supabase Storage | Image uploads for tasks + chat |
| PWA | CRA workbox | Service worker, installable |
| Audio | Web Audio API | No files needed, instant sounds |
| Confetti | canvas-confetti | Lightweight, beautiful |
| Date utils | date-fns | Lightweight, tree-shakeable |

---

## 🔮 Roadmap (Future Features)

- [ ] **Breathing feature** — Guided breathing exercises in side panel
- [ ] **Syllabus** — Shared study material tracker
- [ ] **Push notifications** — Deadline reminders, challenge alerts
- [ ] **Streak tracking** — Daily mission streaks
- [ ] **Chat enhancements** — Reactions, reply threads, voice notes
- [ ] **Settings** — Notification preferences, theme tweaks

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

---

## 💡 Don Norman Design Principles Applied

1. **Visibility** — Task status always visible (color, progress bar, count badges)
2. **Feedback** — Every action has sound + visual response (checkbox click, completion fanfare)
3. **Affordances** — Rectangular buttons with clear labels; `+` for add, `✕` for close
4. **Mapping** — Left button = left user, right button = right user; slide directions match
5. **Constraints** — Missed tasks lock (uneditable); prevents accidental modification
6. **Mental Models** — WhatsApp-style filters (Active/Done/Missed like Unread/Groups/All)
