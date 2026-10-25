# Verity Architecture Specification

> **Version:** 2.1.0  
> **Last Updated:** October 2026  
> **System Classification:** Local-First Compounding Momentum & Longevity Intelligence Platform  

---

## 1. Executive Overview & Design Philosophy

Most self-tracking platforms track *activity volume*—superficial checkmark counts, fragile streaks that trigger anxiety when broken, and gamified dopamine loops. 

**Verity** is engineered on a fundamentally different philosophical premise: **compounding momentum**. It computes *what your daily actions are mathematically compounding into* across four foundational life areas: **Play** (career & deep work), **Health**, **Mind**, and **Social**.

### Core Tenets

1. **Compounding Over Streaks**: A missed day should not reset your progress to zero. Instead, momentum is governed by an **Exponential Moving Average (EMA)** with history decay. A 30-day streak followed by one off-day yields a small dip, not a total wipeout.
2. **Honest, Unforgiving Math**: Every life area produces a single, slowly-moving scalar score between $0$ and $100$, bound to an overall weighted **Composite Score**.
3. **Local-First & Frictionless**: Identity creation occurs instantly on-device using IndexedDB. No passwords, third-party trackers, or cloud lock-in. Data remains private and owned by the user.
4. **Dual Engine Resilience**: Mathematical parity between a high-performance **Rust analytical core** (`rust-core/`) and a zero-dependency **TypeScript scoring engine** (`client/src/lib/scoring.ts`), allowing both serverless edge execution and native CLI performance.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VERITY SYSTEM LANDSCAPE                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌──────────────┐                                       ┌────────────────┐
│ React Client │ (Vite, React 19, CSS System)          │ Server / API   │ (Express / Node.js)
│              │                                       │                │
│  • Local DB  │ IndexedDB (Identities & Metadata)     │  • Wasm SQLite │ sql.js (verity.db)
│  • TS Engine │ EMA Scoring & Analytics               │  • Owner Scope │ Multi-tenant Guest ID
│  • UI Shell  │ Glassmorphism & Adaptive Drawer       │  • Vercel Edge │ api/[...all].ts
└──────────────┘                                       └────────────────┘
       ▲                                                        │
       │                                                        ▼
       │                                               ┌────────────────┐
       └───────────────────────────────────────────────│   Rust Core    │ (Cargo / Native)
                     (Mathematical Parity)             │                │
                                                       │  • Linear Reg  │
                                                       │  • Peak Hours  │
                                                       │  • EMA Engine  │
                                                       └────────────────┘
```

---

## 2. Mathematical Scoring Engine

Verity models human momentum through continuous-time digital signal processing principles.

### 2.1 Life Area Mapping

Every habit is strictly partitioned into one of four canonical life areas:

| Canonical Area | Subdomain & Semantics | Visual Palette |
| :--- | :--- | :--- |
| **Play** | Career, building, shipping, deliberate practice | Cyan / Blue (`#58a6ff`) |
| **Health** | Physiological recovery, autonomic balance, sleep | Emerald Green (`#3fb950`) |
| **Mind** | Reading, reflection, mindfulness, learning | Violet / Purple (`#bc8cff`) |
| **Social** | Relationships, community, family, empathy | Amber / Orange (`#f0883e`) |

### 2.2 Per-Area Daily Completion

For any given area $A$ on date $d$, let $H_A(d)$ be the set of habits scheduled for day $d$. The raw completion ratio $C_A(d) \in [0.0, 1.0]$ is:

$$C_A(d) = \begin{cases} 
\frac{\sum_{h \in H_A(d)} \mathbb{I}(h \text{ checked on } d)}{|H_A(d)|} & \text{if } |H_A(d)| > 0 \\ 
C_A(d-1) & \text{if } |H_A(d)| = 0 \text{ (neutral carry-over)} 
\end{cases}$$

### 2.3 Exponential Moving Average (EMA) Momentum

To translate daily discrete check-ins into continuous compounding momentum, Verity updates the area score $S_A(d) \in [0, 100]$ using a tunable smoothing coefficient $\alpha$ (default $\alpha = 0.2$):

$$S_A(d) = \alpha \cdot \Big(100 \cdot C_A(d)\Big) + (1 - \alpha) \cdot S_A(d-1)$$

* When $\alpha = 0.2$, the half-life of habit momentum is approximately $3.1$ days:

$$t_{1/2} = \frac{\ln(0.5)}{\ln(1 - \alpha)} \approx 3.106 \text{ days}$$

* This means momentum reflects a rolling ~14-day trailing window where recent days have greater exponential weight, but consistent historical performance anchors the score.

### 2.4 Weighted Composite Score

The master metric representing total life balance is the **Composite Score** $\Phi(d) \in [0, 100]$:

$$\Phi(d) = \frac{4 \cdot S_{\text{Health}}(d) + 5 \cdot S_{\text{Mind}}(d) + 3 \cdot S_{\text{Social}}(d) + 4 \cdot S_{\text{Play}}(d)}{16}$$

* **Mind** ($w = 5$) and **Health** ($w = 4$) are intentionally weighted highest, as cognitive clarity and biological baseline form the foundation for sustainable career output (**Play**, $w=4$) and relational vitality (**Social**, $w=3$).

### 2.5 Multi-Zoom Analytics & Forward Projections

The continuous scoring series is displayed across three adaptive windows:

1. **Weekly Zoom (7 Days)**: Daily fidelity of raw completion and instantaneous momentum ticks.
2. **Monthly Zoom (30 Days)**: Trajectory curve combined with a 7-day simple moving average (SMA) baseline overlay.
3. **Annual Zoom (52 Weeks)**: Downsampled weekly median points capturing long-term seasonal compounding.
4. **Forward Extrapolation**: A linear regression line projected 7–14 days into the future:

$$\hat{S}(d + \Delta t) = S(d) + \beta \cdot \Delta t$$

where $\beta$ is the least-squares slope derived from the last 14 days of data:

$$\beta = \frac{\sum_{i=1}^{N} (t_i - \bar{t})(S_i - \bar{S})}{\sum_{i=1}^{N} (t_i - \bar{t})^2}$$

---

## 3. System Topology & Directory Structure

```
verity/
├── api/                           # Vercel Serverless Function entry point
│   └── [...all].ts                # Catch-all bridge into Express server
├── client/                        # Frontend Single-Page Application (SPA)
│   ├── src/
│   │   ├── components/            # UI components (Analytics, Dashboard, Health, UI)
│   │   │   ├── auth/              # GuestEntry setup & identity UI
│   │   │   ├── dashboard/         # AreaChecklist, TargetsPanel, WeeklyHabitGrid
│   │   │   ├── health/            # LongevityMap, physiological views
│   │   │   └── ui/                # Topbar, PageHeader, VerticalBurgerButton, etc.
│   │   ├── hooks/                 # React state & orchestration hooks
│   │   │   ├── useAnalytics.ts    # Correlation & weekly report logic
│   │   │   ├── useAreaColors.tsx  # Dynamic & canonical area color mappings
│   │   │   ├── useDashboard.ts    # Scoped cached dashboard summaries
│   │   │   ├── useHabits.ts       # Habit management & local streak resolution
│   │   │   ├── useHealth.ts       # Health checkins, DOB calculation, longevity
│   │   │   ├── useScoring.ts      # 4-area compounding scoring pipeline
│   │   │   └── useSettings.ts     # Profile, measurements & preference sync
│   │   ├── lib/                   # Pure business logic, DB, & API client
│   │   │   ├── api.ts             # REST client with scoped guest identity headers
│   │   │   ├── auth.tsx           # React AuthProvider & IndexedDB identity lifecycle
│   │   │   ├── localDb.ts         # Browser IndexedDB storage implementation
│   │   │   ├── scoring.ts         # TypeScript EMA scoring engine
│   │   │   └── settings.ts        # Schema validation & local persistence
│   │   ├── pages/                 # Route pages (Dashboard, Habits, Health, etc.)
│   │   ├── macos.css              # Glassmorphic system styling
│   │   └── ui_polish.css          # Vertical burger, drawer & animation suite
│   ├── package.json
│   └── vite.config.ts
├── docs/                          # Architectural specs, changelog, checklists
│   ├── ARCHITECTURE.md            # This document
│   ├── CHANGELOG.md               # Version history
│   └── QA_CHECKLIST.md            # Quality assurance test suite
├── rust-core/                     # High-performance analytics engine (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                # Stdin/stdout JSON IPC interface
│       ├── pipeline.rs            # Master analytical dispatcher
│       ├── scoring.rs             # Rust EMA scoring implementation
│       ├── regression.rs          # Ordinary Least Squares (OLS) regression
│       ├── sleep_correlation.rs   # Sleep vs. focus duration correlation
│       ├── peak_hours.rs          # Hour-of-day execution heatmap analysis
│       ├── area_balance.rs        # Life area equilibrium calculation
│       └── types.rs               # Strongly-typed serde serialization
├── server/                        # Express backend & persistence layer
│   ├── app.ts                     # Express application factory & middleware
│   ├── auth.ts                    # Guest identity header extraction
│   ├── db.ts                      # Wasm SQLite (sql.js) manager with auto-migration
│   ├── index.ts                   # Local development HTTP server runner
│   ├── routes/                    # API route handlers
│   │   ├── areas.ts               # CRUD for life areas & colors
│   │   ├── dashboard.ts           # Streaks, consistency & weekly matrix
│   │   ├── habits.ts              # Habits, check-ins, & batch fetches
│   │   ├── health.ts              # Physiological markers & longevity algorithm
│   │   └── utils.ts               # Standardized time synchronization
│   └── utils/
│       ├── rustCore.ts            # Child process spawn & IPC communication
│       └── time.ts                # Date formatting & timezone normalization
└── package.json                   # Monorepo task orchestration
```

---

## 4. Data Layer & Multi-Tenancy Architecture

Verity operates as a **hybrid local-first system**. Identity is anchored on-device in IndexedDB, and persistent workspace state is scoped by an isolated `owner_id` in SQLite.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT ENVIRONMENT                   │
├──────────────────────────┬─────────────────────────────┤
│   IndexedDB (Browser)    │   localStorage (Browser)    │
│  • identities            │  • verity_settings_v2       │
│  • meta (activeIdentity) │  • verity_sidebar_collapsed │
│  • records (offline)     │  • verity_dashboard_cache   │
└────────────┬─────────────┴──────────────┬──────────────┘
             │                            │
             │ X-Verity-Guest-ID          │
             ▼                            ▼
┌────────────────────────────────────────────────────────┐
│                   SERVER ENVIRONMENT                   │
├────────────────────────────────────────────────────────┤
│                 Express Authentication                 │
│         getOwnerId(req) -> validated owner_id          │
│                            │                           │
│                            ▼                           │
│                   sql.js SQLite Database               │
│  • habits          (WHERE owner_id = ?)                │
│  • checkins        (WHERE owner_id = ?)                │
│  • areas           (WHERE owner_id = ?)                │
│  • health_checkins (WHERE owner_id = ?)                │
│  • bio_markers     (WHERE owner_id = ?)                │
└────────────────────────────────────────────────────────┘
```

### 4.1 Client-Side Identity Store (IndexedDB)

The database `verity-local-first` (Version 1) contains three stores:

1. **`identities`** (keyPath: `id`): Stores `GuestIdentity` records:
   ```typescript
   interface GuestIdentity {
     id: string;            // Format: "guest_" + UUIDv4
     username: string;      // User's chosen display name
     createdAt: string;     // ISO timestamp
     lastSeenAt: string;    // ISO timestamp
     accountType: 'guest';
   }
   ```
2. **`meta`** (keyPath: `key`): Stores environment metadata, notably `activeIdentityId`.
3. **`records`** (keyPath: `id`): General offline document store with index on `['ownerId', 'type']`.

### 4.2 SQLite Server Persistence (`sql.js`)

Verity uses `sql.js` (WebAssembly-compiled SQLite 3) for persistence without requiring heavy native compilation toolchains during deploy.

* **Database File Resolution**: Checks `VERITY_DB_FILE`, falling back to `verity.db`, with graceful backwards compatibility for legacy `karma-yoga.db`.
* **Zero-Downtime Schema Migrations**: `ensureOwnerScopedTable` dynamically migrates legacy single-user tables to multi-tenant structures with `owner_id` scoping.
* **Foreign Key Integrity**: Enforced via `PRAGMA foreign_keys = ON;` with cascade deletes:
  ```sql
  CREATE TABLE checkins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date      TEXT NOT NULL,
    owner_id  TEXT NOT NULL DEFAULT 'guest_legacy',
    UNIQUE(habit_id, date, owner_id)
  );
  ```

---

## 5. Client Application & UI/UX Architecture

The client is built on **React 19**, **TypeScript 5.4+**, and **Vite 8**. It eschews utility bloat in favor of a bespoke, glassmorphic design system modeled after macOS desktop ergonomics.

### 5.1 Responsive Shell & Navigation Architecture

```
                  ┌──────────────────────┐
                  │    Viewport Width    │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Desktop (> 900px) ]             [ Mobile (≤ 900px) ]
┌───────────────────────────┐     ┌───────────────────────────┐
│  Sidebar (260px or 72px)  │     │  Sticky Mobile Topbar     │
│  • Geometric V Mark       │     │  • Vertical Burger (⋮)    │
│  • 5 Handcrafted Icons    │     │  • Page Title             │
│  • Active Gradient Pill   │     │  • Search & Avatar Badge  │
│  • User Status Footer     │     └─────────────┬─────────────┘
└─────────────┬─────────────┘                   │
              │                                 ▼
              │                   ┌───────────────────────────┐
              │                   │ Slide-In Drawer (Overlay) │
              │                   │  • Backdrop Blur Dimmer   │
              │                   │  • Closes on Route Change │
              │                   └─────────────┬─────────────┘
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                       Workspace Shell                       │
│  • Topbar (Window controls, Cmd+K search, Date, User)       │
│  • App Main (Page content with staggered spring entrance)   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Micro-Interactions & Spring Physics

* **Apple-Style Spring Easing**: Standardized across navigation links, cards, and modal sheets using `cubic-bezier(0.16, 1, 0.3, 1)`.
* **Staggered Page Entrance**: Four-stage cascaded revealing (`anim-stagger-1` through `anim-stagger-4`) to eliminate visual popping.
* **Habit Check-In Pop**: Checkmark toggling triggers `@keyframes check-pop` (`scale(0.85)` $\to$ `scale(1.24)` $\to$ `scale(1.0)`) with an area-colored luminescence halo.
* **Vertical Burger Toggle**: A vertical three-dot glyph (`⋮`) with a 34px hit box, frosted glass background, and neon mint focus aura.

---

## 6. Server & API Architecture

The server exposes a clean REST API running on Express.

```
Client Request
      │
      ▼
┌──────────────────────────────────────────────────────────────────┐
│ Middleware Chain                                                 │
│  1. CORS (Cross-Origin Resource Sharing)                         │
│  2. express.json() (JSON body parser)                            │
│  3. ensureDbReady() (Wasm SQLite initialization check)           │
│  4. getOwnerId() (Extracts X-Verity-Guest-ID with legacy fallbacks│
└─────────────────────────────────┬────────────────────────────────┘
                                  │
      ┌───────────────────────────┼──────────────────────────┐
      ▼                           ▼                          ▼
/api/habits                 /api/dashboard             /api/health
• GET    /                  • GET /streaks             • GET  /today
• POST   /                  • GET /weekly              • POST /checkin
• GET    /all/checkins                                 • GET  /longevity
• POST   /:id/checkin                                  • GET  /trends/:metric
• DELETE /:id                                          • POST /markers
```

---

## 7. Native Rust Analytical Core (`rust-core/`)

The Rust analytical engine is compiled to a native static executable (`verity_core` / `verity_core.exe`).

* **Communication Protocol**: Inter-Process Communication (IPC) via `stdin` and `stdout` using serialized JSON payloads.
* **Safety & Performance**: Memory safe with zero garbage collection pauses. Computes multi-year EMA trajectories and linear regression in sub-millisecond timeframes.
* **Pipeline Execution**:
  1. `main.rs` reads standard input into an in-memory buffer.
  2. `serde_json` deserializes payload into `AnalyticsRequest`.
  3. `pipeline::run_analytics()` runs parallel routines:
     * `scoring::run_scoring()` — EMA scoring engine.
     * `regression::linear_regression()` — OLS regression for slope and correlation.
     * `peak_hours::peak_hours_grid()` — Binned temporal habit execution density.
     * `area_balance::area_balance_by_areas()` — Shannon entropy and distribution variance across areas.
  4. Response is serialized and written to standard output.

---

## 8. Audit Findings & Implemented System Optimizations

During a comprehensive architectural code audit, several subtle bugs and architectural gaps were identified and resolved:

### 1. Settings Synchronization Gap (Resolved)
* **Gap**: When creating a guest profile in `GuestEntry`, the chosen username was persisted exclusively to IndexedDB. The app settings profile name in localStorage (`verity_settings_v2`) remained blank, forcing users to re-enter their username in Settings.
* **Resolution**: Updated `joinAsGuest()` in [`auth.tsx`](file:///c:/Users/Shanmugavedhan/Downloads/1.%20Projects/verity/client/src/lib/auth.tsx) and [`useSettings`](file:///c:/Users/Shanmugavedhan/Downloads/1.%20Projects/verity/client/src/hooks/useSettings.ts) to execute an immediate, two-way reactive sync between IndexedDB identities and `settings.profile.name`.

### 2. Longevity Age Hardcoding Bug (Resolved)
* **Gap**: In [`useHealth.ts`](file:///c:/Users/Shanmugavedhan/Downloads/1.%20Projects/verity/client/src/hooks/useHealth.ts), the biological age calculation was querying an obsolete localStorage key (`karma_yoga_settings`) and checking an invalid field `settings.dateOfBirth`. As a result, longevity calculations always defaulted to `age = 25`.
* **Resolution**: Refactored `useHealth` to source `dateOfBirth` directly from the centralized `loadSettings().profile.dateOfBirth`, allowing accurate real-time biological age calculations.

### 3. Guest Cache Leakage (Resolved)
* **Gap**: Both `useDashboard` and `useHabits` stored client cache under global, un-scoped keys (`dashboard_cache` and `habits_cache`). Switching guest accounts or clearing identities left stale cached data visible.
* **Resolution**: Scoped all cache keys by the active guest owner ID (`verity_dashboard_cache_${ownerId}` and `verity_habits_cache_${ownerId}`).

### 4. Client API Header Invalidation (Resolved)
* **Gap**: In [`api.ts`](file:///c:/Users/Shanmugavedhan/Downloads/1.%20Projects/verity/client/src/lib/api.ts), `activeGuestId` was cached once at the module level. Subsequent identity creation or switching did not invalidate the in-memory variable, risking requests made with stale identity headers.
* **Resolution**: Exported `setActiveGuestId()` and wired it directly into `joinAsGuest()` and `restoreIdentity()`.

### 5. Mobile Layout Iteration (Resolved)
* **Gap**: On mobile screens (`max-width: 900px`), the sidebar rendered in-flow above the workspace, consuming the top half of the screen and pushing the dashboard out of view.
* **Resolution**: Replaced the in-flow sidebar with a slide-in off-canvas glassmorphic drawer paired with a fixed mobile app bar and vertical three-dot toggle button.

---

## 9. Verification & Build Integrity

The codebase is strictly typed and verified across all compilation targets:

```bash
# Verify Client Compilation
npm run build:client
# ✓ built in ~220ms with 0 errors

# Verify Server Compilation
npm run build:server
# ✓ tsc passes with 0 errors

# Verify Rust Core Compilation
cargo check --manifest-path rust-core/Cargo.toml
# ✓ compiles with 0 errors
```
