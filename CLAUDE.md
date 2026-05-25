# CLAUDE.md — Wellbeing Dashboard

> Project context for future Claude Code sessions. Read first.

## What this is

A static-site dashboard that forecasts U.S. state-level **frequent mental
distress** prevalence from two CDC PLACES indicators. It is the
interactive companion to `Health.ipynb` from the user's research repo
[`lama9811/Mental-Distress-Prediction`](https://github.com/lama9811/Mental-Distress-Prediction).

The dashboard is meant to accompany a poster presented at Morgan State
University's **Spring Into Research Symposium 2026** (Apr 13, 2026).

## The user

- **Mingma Lama** — CS student at Morgan State University, Baltimore
- Co-author: Daniel Owolabi · Mentor: Prof. Radhouane Chouchane
- Comfortable in Python / Jupyter / Colab; less so with raw web stack
- Prefers concise direct collaboration; will tell you bluntly when a
  design "looks AI" or "feels old"
- Pushes for "responsive" + visually striking outputs but rejects dark
  themes, 3D extrusions, glassmorphism, and aurora-gradient aesthetics

## The model (LOCKED — do not refit)

State-level OLS regression from `Health.ipynb` cell 47:

```
distress = 6.162857696868079
         + 0.31342386 · depression
         + 0.27670656 · financial_threat
```

- **n = 52** (50 states + DC + national aggregate)
- **Train / test:** 41 / 11 hold-out (random_state=42)
- **R² (test):** 0.722 · **RMSE:** 0.532 percentage points
- **Predictors:**
  - `depression` — CDC PLACES "Depression among adults", crude prevalence %
  - `financial_threat` — mean of 4 CDC prevalences: housing insecurity,
    utility shut-off, food insecurity, food-stamp receipt
- **Notebook test case for verification:**
  `predict(4, 4) → 8.523` (matches notebook output exactly)

These coefficients are **baked into `app.js`** as `MODEL`. Don't recompute
them in JavaScript or fit anything client-side.

## Data

`data.js` ships **51 per-state records** (50 states + DC) pulled live from
the CDC Socrata API (`chronicdata.cdc.gov/resource/swc5-untb.json`).

- For each state: `depression`, `housing`, `utility`, `food`, `stamps`,
  derived `financial_threat`, and `distress_actual` (the CDC-reported
  ground truth used for residual display).
- Kentucky (KY) and Pennsylvania (PA) have **no county-level data** for
  any of the 6 measures in CDC PLACES — values are mean-imputed (matches
  the notebook's `pivot_2.fillna(pivot_2.mean(...))`).
- 9 other states (CO, FL, OR, SD, TN, TX, VT, WA, WY) are missing the 4
  financial-threat components; those are also mean-imputed.
- The `imputed` field on each record lists which keys were filled.

If you ever need to regenerate `data.js`, the Python script lives in
the chat history of the build session — query CDC Socrata with the 6
measure names + `data_value_type='Crude prevalence'`, average by state,
mean-impute gaps, then emit `data.js`.

## Tech stack (LOCKED — do not change)

- **Vanilla HTML / CSS / JS.** No build step, no bundler.
- **d3 v7 + topojson-client v3 + us-atlas v3** via unpkg CDN — used only
  for the SVG choropleth.
- **NO Tailwind, NO React, NO Three.js, NO TypeScript.**
- Deployable to GitHub Pages directly from repo root.

The user previously asked for "3D" and then explicitly reverted because
the result felt "AI". Do not re-introduce 3D unless the user asks for it
again unambiguously, AND do not re-introduce dark / aurora / glassy
themes — see *Forbidden directions* below.

## Design system

Lifted from the user's poster. **Do not deviate.**

| Token | Hex | Use |
|-------|-----|-----|
| `--paper` | `#f4ede0` | page background |
| `--panel` | `#fbf6ea` | card surface |
| `--ink` | `#2a2418` | body type |
| `--muted` | `#8a7f6a` | secondary type |
| `--rule` | `#d9cdb3` | dividers, borders |
| `--wine` | `#8e2a23` | primary accent, high-distress |
| `--sage` | `#3d6b3d` | secondary accent, low-distress |
| `--navy` | `#1a1f2c` | dark callouts ("In Summary", result card) |
| `--cream` | `#f4ede0` | text on navy |

Typography:
- **Display:** Source Serif 4 (variable, opsz)
- **Body:** Inter Tight
- **Mono / data:** JetBrains Mono

Section headings use a numbered wine chip (`1`, `2`, …) + letter-spaced
small-caps kicker — directly mirrors the poster.

## File map

```
Mental Distress Dashboard/
├── index.html       — page structure (poster layout, 6 sections)
├── styles.css       — full design system + responsive rules
├── app.js           — model + state picker + d3 choropleth glue
├── data.js          — 51-state CDC aggregates (auto-generated)
├── DASHBOARD.md     — run + deploy notes (named to avoid clashing
│                       with the repo's existing README.md)
├── wellbeing-desktop-1440.png — preview screenshot
└── CLAUDE.md        — this file
```

`app.js` contains the linear-model coefficients, the choropleth renderer,
the state picker logic, the leaderboards, and the slider handlers. It's
~360 lines and intentionally monolithic — there is no reason to split it.

## Running locally

```bash
cd "/Users/mingmalama/Desktop/Mental Distress Dashboard"
python3 -m http.server 8765
open http://localhost:8765/index.html
```

`file://` won't work because `d3.json(...)` fetches `us-atlas` over CORS.

## Deployment (GitHub Pages)

The push lives at branch `feat/wellbeing-dashboard` on
[`lama9811/Mental-Distress-Prediction`](https://github.com/lama9811/Mental-Distress-Prediction).
Open the PR, merge to `main`, then:

> **Settings → Pages → Build and deployment → Branch: `main` / `/ (root)`**

It will be live at `https://lama9811.github.io/Mental-Distress-Prediction/`.

## Verification

Before reporting any change as complete:

1. Start the server (`python3 -m http.server 8765`)
2. Confirm `predict(20.9, 11.7) → 15.95` (Maryland default) renders correctly
3. Confirm `predict(4, 4) → 8.523` (the notebook's literal test case)
4. Hit the page in a browser; check console is clean (favicon 404 is fine)
5. Click a state on the choropleth — selection + prediction must update
6. Screenshot at 1440 / 820 / 390 widths if doing layout work

The Playwright MCP plugin (`mcp__plugin_playwright_playwright__*`) is
the right tool for headless verification.

## Forbidden directions

The user has explicitly rejected these. Do **not** propose or build them
without an unambiguous fresh request:

- **3D extruded cartograms / Three.js scenes.** Tried; user said "looks
  AI" and "I don't want the 3D look."
- **Dark themes / aurora-gradient mesh backgrounds / glassmorphism.**
  Same reasoning. "Change to original."
- **Tailwind utility classes in markup.** First attempt; user shifted to
  preferring hand-written CSS via the poster's color system.
- **Streamlit or Python-backed dashboards.** Was discussed in
  brainstorming; user picked the static-site path.
- **Slider-only / no-state-picker UX.** The user explicitly wants
  state-driven prediction (poster's mockup shows it that way).

## Open follow-ups (if user asks)

These were discussed but not implemented:

- Per-state predicted-vs-actual scatter on the test set (was in v1, removed
  when the design shifted to state-driven)
- "Prediction history" log (offered, user declined)
- Random-forest benchmark comparison (declined — the user said "only this
  method should be on the dashboard")

## Memory hooks (related notes)

Future Claude Code sessions: if the user references specific past choices,
check this file before re-asking. If they ask for a redesign and you're
about to propose anything in *Forbidden directions* above, push back with
a "we tried this and you rejected it" before committing to the work.
