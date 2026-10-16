# Verity

> Most self-tracking apps show you *what you did* (counts, streaks, raw percentages).
> Verity shows you *what it's compounding into* — one honest, slowly-moving number per life area, plus a composite score, backed by an Exponential Moving Average (EMA).

Verity is a local-first personal compounding engine for power users who track their life and want real mathematical analysis — not habit-formation nudges or gamified streaks.

---

## The Core Product: Compounding Scoring Engine

### 1. Per-Area Daily Score
Tracks 4 canonical life areas: **Play** (career), **Health**, **Mind**, and **Social**. Each day:

$$\text{completion}(\text{area}) = \frac{\text{items ticked}}{\text{items possible}} \quad (0.0 - 1.0)$$

This raw ratio feeds an Exponential Moving Average so the score retains history and momentum rather than resetting daily:

$$\text{score}_{\text{today}}(\text{area}) = \alpha \times \text{completion}(\text{area}) \times 100 + (1 - \alpha) \times \text{score}_{\text{yesterday}}(\text{area})$$

- $\alpha$ (alpha) defaults to **0.2** (tunable constant).
- Scores exist on a continuous 0–100 scale.

### 2. Weighted Composite Score

$$\text{composite} = \frac{4 \times \text{Health} + 5 \times \text{Mind} + 3 \times \text{Social} + 4 \times \text{Play}}{16}$$

### 3. Multi-Zoom Visualization & Forward Projection
One continuous time series viewed at 3 zoom levels:
- **Weekly**: Raw daily points, last 7 days.
- **Monthly**: Raw daily points, last 30 days + 7-day rolling average overlay.
- **Annual**: Aggregated to 1 point per week (~52 points).
- **Trajectory Projection**: Dashed extrapolation line forward past today based on the recent 7–30 day slope.

---

## Features

- **Area Checklist** — Replaces fragmented habit quick-lists with a unified 4-area daily execution checklist on the Dashboard.
- **Composite Score Graph** — Interactive multi-series visualization in Analytics featuring all 4 areas, the bold composite line, rolling averages, and trajectory projections.
- **Longevity Map** — Physiological health breakdown analyzing 4 vital pillars: Autonomic/Cardiovascular (HRV, Resting HR), Sleep/Recovery, Metabolic/Movement, and Vitality Tone.
- **Local-First Architecture** — Device-local guest identities stored in IndexedDB with zero-friction entry and automatic restoration.
- **Dual Engine Architecture** — Built with a high-performance Rust core (`rust-core/`) and a mirrored TypeScript engine (`client/src/lib/scoring.ts`) for complete resilience across platforms.
- **Backward Compatibility** — Dual-header support (`X-Verity-Guest-ID` and legacy `X-Karma-Guest-ID`) and seamless SQLite database migration.

---

## Quick Start

```bash
# Install dependencies
npm run install:all

# Run development servers
npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:3001

---

## Build Commands

```bash
# Build Client
npm run build:client

# Build Server
npm run build:server

# Build Rust Core (optional)
npm run build:rust-core
```
