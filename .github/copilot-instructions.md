# Sequent — Copilot Instructions

Sequent is an offline-first productivity app (tasks + calendar) built with SolidJS, Vite, Supabase, and IndexedDB. It runs as a web PWA, Electron desktop app, and Android app (Capacitor).

## Commands

```bash
npm run dev          # Dev server on http://localhost:3000
npm run build        # Production build → dist/
npm run test         # Vitest unit tests (run all)
npx vitest run src/stores/taskStore.test.js  # Run a single unit test file
npm run test:e2e     # Playwright E2E (auto-starts dev server)
npm run start        # Build + launch Electron desktop app
```

Required env vars in `.env.local`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

### Offline-First Data Flow

Every mutation goes through a single pipeline:
1. **Optimistic UI** — update the SolidJS store in-memory immediately
2. **`syncEngine.enqueue(table, action, payload)`** — writes to IndexedDB (`syncQueue` + data store) and triggers a Supabase upsert/delete if online
3. **Realtime** — `syncEngine.subscribe()` listens to Supabase Postgres changes and keeps the local cache warm

On app load, `syncEngine.hydrate()` loads IndexedDB for instant UI, then fetches fresh data from Supabase if online.

**Conflict resolution**: Last-Write-Wins based on `updated_at`. If the server record is newer, the local update is silently dropped.

### Stores (`src/stores/`)

All stores follow the same SolidJS pattern — `createStore` internally, exported as a plain object with a `get state()` accessor:

```js
const [state, setState] = createStore({ ... });
export const myStore = {
  get state() { return state; },
  doSomething: () => { /* setState + syncEngine.enqueue */ }
};
```

Stores:
- `taskStore` — tasks and lists
- `eventStore` — events and calendars
- `authStore` — Supabase session, user profile (auto-created if missing)
- `uiStore` — active view, theme, sidebar state, modals, `activeDate`
- `syncEngine` — orchestrates IndexedDB ↔ Supabase sync (not a SolidJS store)

### Data Mapping (UI ↔ DB)

The UI uses camelCase; Supabase uses snake_case. `syncEngine.js` exports `mapToDbFormat` and `mapFromDbFormat` for all conversions. Key mappings:

| UI field | DB field |
|---|---|
| `listId` | `list_id` |
| `calendarId` | `calendar_id` |
| `completed` (bool) | `status` ('pending'/'completed') |
| `scheduled_date` (ISO string) | `due_date` (DATE only) |

Always pass data through these mappers — never write raw DB field names into store objects.

### Local Database (`src/lib/db.js`)

IndexedDB accessed via the `idb` wrapper. Object stores: `tasks`, `lists`, `events`, `calendars`, `syncQueue`. Use `localDB.put/get/getAll/delete/clear(storeName, ...)`.

### Views

Five main views controlled by `uiStore.state.view`: `timeline`, `calendar`, `tasks`, `archive`, `settings`. Rendered conditionally in `App.jsx`. Global modals (`AddEventModal`, `AddTaskModal`, etc.) live outside the view container.

### Edge Functions (`supabase/functions/`)

Deno-based Supabase Edge Functions:
- `gemini-proxy` — proxies Gemini 2.5 Flash API (keeps `GEMINI_API_KEY` server-side)
- `weather-proxy` — proxies Tomorrow.io weather API

## Key Conventions

**IDs**: Always use `generateId()` from `src/lib/id.js` (`crypto.randomUUID()`), never manually construct IDs.

**Sanitization**: Use `sanitizeText()` for plain text fields (titles, names) and `sanitizeHtml()` for rich text. Both from `src/lib/sanitize.js` (DOMPurify).

**Styling**: Tailwind v4 with CSS custom properties for theming. Use semantic tokens like `bg-bg-theme`, `text-text-primary`, `text-text-secondary`, `text-accent`, `border-border-theme` — not raw Tailwind color classes. Theme color is set via `--accent` / `--accent-rgb` CSS variables at runtime by `uiStore.setTheme()`.

**Reactive proxies and IndexedDB**: SolidJS store objects are reactive proxies and cannot be stored in IndexedDB directly. Strip them with `JSON.parse(JSON.stringify(payload))` before any `localDB.put` call (already done inside `syncEngine.enqueue`).

**Unit test pattern**: Mock `syncEngine` to prevent IndexedDB access in unit tests:
```js
vi.mock('../../src/stores/syncEngine', () => ({
  syncEngine: { enqueue: vi.fn() }
}));
```
Unit tests live alongside source files (`*.test.js`) or in `tests/unit/`. E2E tests are in `tests/e2e/` and are excluded from Vitest.

**Database migrations**: Add new migration files to `supabase/migrations/` with timestamp-prefixed names. All tables use RLS with `auth.uid() = user_id` policies.
