# Clinical Trial Eligibility Screener

A local web app that screens ~500 clinical notes against a trial's eligibility
criteria using [TypeSafe's Jev](https://docs.typesafe.ai) model, one
`systemOne` call per note, streaming results into a table as they land. The
demo is about speed: a full screen should finish in about a second, and you
watch it happen.

> **Synthetic data only.** This tool is a demonstration. Never load real
> patient data into it. The `truth` object that ships with each synthetic note
> is used only by the evaluation panel and is never sent to Jev or Claude.

![Day mode, 500 notes screened](docs/screenshots/desktop.png)

## What it does

- **Left pane:** the trial protocol as a list of criteria. Every field is
  editable in place (Enter or click away commits). Each criterion is either a
  **Noul** (yes/no probability) or a **Score** (graded levels), and is marked
  inclusion or exclusion.
- **Right pane:** one row per note. A status field (Eligible / Ineligible /
  Review) and one lamp per criterion: filled = condition holds, hollow = absent,
  half = uncertain, dashed = pending. Color adds the trial reading (green
  favorable, red unfavorable, amber uncertain); the shape carries it alone.
- **Run** (or edit a criterion) and Jev evaluates every note. Results stream
  over Server-Sent Events in arrival order; each landing lamp blips once.
- **Confidence limit** slider re-rolls every status instantly from cached
  probabilities, with no API calls.
- **Editing a criterion** changes its hash, so only that criterion is re-asked
  across all notes; unchanged criteria come from the cache. Its column dims
  until the results refill.
- **Flipped** filter: notes whose status changed since the previous run, with
  the criterion that flipped them.
- **Eval** drawer: per-criterion accuracy against ground truth and a
  calibration plot (stated confidence vs observed accuracy).
- **Claude** as compiler: describe the trial in plain English and Claude
  produces typed criteria as JSON; after a run it can write a short summary
  from aggregate counts only. It never sees note text.

## Setup

Requirements: Node 20.6 or newer.

```bash
npm install
cp .env.example .env         # add TYPESAFE_API_KEY, or set MOCK_JEV=true
# put your notes at data/notes.jsonl (one JSON object per line, see below)
npm run import               # loads notes into SQLite (data/screener.db)
npm run dev                  # backend on :8787, UI on http://localhost:5173
```

`npm run dev` starts both processes. The backend also imports
`data/notes.jsonl` automatically on first start if the database is empty.

### Credentials

| Credential | Where it lives |
|---|---|
| `TYPESAFE_API_KEY` | `.env`, read by the backend. Never sent to the browser. |
| Anthropic API key | Entered in the web app (Claude drawer, masked input). Held in backend memory for the process lifetime. Never written to disk or logs. |

Set `MOCK_JEV=true` to use a fake Jev client that returns plausible answers
with 70–500 ms of jitter, so the UI can be tuned without quota.

### Notes file format

`data/notes.jsonl`, one object per line:

```json
{ "id": "N-0001", "text": "...", "format": "soap",
  "truth": { "age": 58, "sex": "F",
    "diagnoses": [{ "code": "E11.9", "name": "Type 2 diabetes mellitus", "onset": "2015-03-10", "active": true }],
    "meds": [{ "name": "metformin 1000 mg BID", "start": "2016-02-01", "stop": null }],
    "labs": [{ "name": "HbA1c", "value": 8.2, "unit": "%", "date": "2026-06-01" }],
    "procedures": [], "familyHistory": [],
    "hardCases": [{ "type": "negation", "detail": "denies polyuria, polydipsia, or polyphagia" }] } }
```

`hardCases` is optional generator metadata (which deliberately-hard facts the note was
assigned — discontinued meds, historical findings, family-history confounders, stale or
duplicate labs, negations) and is absent on hand-written fixtures; the screener itself
never reads it.

A 12-note handwritten fixture lives at `tests/fixtures/notes.sample.jsonl` for
tests and local smoke runs (`NOTES_PATH=tests/fixtures/notes.sample.jsonl npm
run import`). For a full 500-note dataset, generate one with `generate.ts` —
see [Generating synthetic notes](#generating-synthetic-notes) below.

### Environment

| Variable | Default | Meaning |
|---|---|---|
| `TYPESAFE_API_KEY` | — | Required unless `MOCK_JEV=true` |
| `MOCK_JEV` | `false` | Use the fake client |
| `MOCK_JEV_429_RATE` | `0` | Mock only: fraction of calls that return a simulated 429 |
| `JEV_CONCURRENCY` | `50` live, `160` mock | Bounded fan-out pool size |
| `JEV_MODEL` | `jev-latest` | Model alias or pinned version |
| `PORT` | `8787` | Backend port |
| `NOTES_PATH` | `data/notes.jsonl` | Notes file for import |
| `DB_PATH` | `data/screener.db` | SQLite file |
| `ANTHROPIC_API_KEY` | — | Required by `generate.ts`; also usable by the Claude drawer instead of pasting a key |

## Generating synthetic notes

> **Synthetic data only.** `generate.ts` never reads or touches real patient
> data, and its output must never be mixed with real patient data.

```bash
cp .env.example .env          # add ANTHROPIC_API_KEY
npx tsx generate.ts --preview 5                          # print 5 sample notes with their truth, don't write a file
npx tsx generate.ts --count 500 --seed 42 --out data/notes.jsonl
npm run import                                            # load the result into the screener
```

| Flag | Default | Meaning |
|---|---|---|
| `--count <n>` | `500` | Number of notes to generate |
| `--seed <n>` | `42` | RNG seed — same seed + count always produces identical truth |
| `--out <path>` | `data/notes.jsonl` | Output JSONL path |
| `--model <id>` | `claude-sonnet-5` | Model used to render note prose |
| `--resume` | off | Skip ids already present in `--out` and append to it |
| `--preview <n>` | — | Render `n` sample notes and print them with their truth to stdout; doesn't write `--out` |

### How it works

1. **Truth sampling (`generator/truth.ts`)** — deterministic, seeded, no LLM
   call. Samples age, sex, a realistic set of comorbid chronic conditions
   (T2DM, hypertension, CKD, CAD, COPD, depression, hyperlipidemia, obesity,
   OSA, and more), consistent meds, correctly-united labs (HbA1c, eGFR,
   creatinine, LDL, BP, BMI), a note format, and 0+ "hard cases" (a
   discontinued med, a historical/inactive finding, a family-history
   confounder, a stale lab, a duplicate lab, or an explicit negation) — all
   recorded in `truth` so rendering and verification stay consistent. About a
   third of patients are built to satisfy the bundled default T2D protocol
   (`server/protocol.ts`) end to end; the rest fail exactly one of its
   inclusion/exclusion criteria or have unrelated conditions, so a default run
   yields a mixed eligible/ineligible split.
2. **Rendering (`generator/render.ts`)** — turns each patient's truth into
   note prose via Claude (default `claude-sonnet-5`, at `output_config.effort:
   "medium"` — note-writing is high-volume and not reasoning-heavy, so medium
   effort holds quality at lower cost; skipped automatically if `--model`
   names a Haiku model, which rejects `effort`), batching 5 patients per
   request with 5 batches in flight at once. The model is instructed to
   include every fact in `truth`, invent nothing beyond it, weave in the
   assigned hard cases naturally, vary voice/length/abbreviation density, and
   add filler (social history, ROS boilerplate) that introduces no new
   diagnosis, med, or lab. The SDK client retries 429s and 5xxs with backoff;
   results are written to `--out` incrementally, so a killed run can be
   continued with `--resume`.
3. **Verification** — every note is checked two ways before being accepted: a
   free deterministic pass (`generator/verify.ts`) confirms every lab value
   and medication name appears in the text, and an LLM pass (Haiku 4.5) checks
   whether the note introduces any diagnosis, medication, or lab not in
   `truth`. A note that fails either check is regenerated, up to 2 retries;
   notes that still fail are written anyway (best effort) and logged to
   stderr so you can inspect or `--resume` them.

At the end the CLI prints token counts and an estimated cost, split between
the rendering model and the Haiku 4.5 verification pass.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Backend (tsx watch) plus Vite |
| `npm run import` | Load `data/notes.jsonl` into SQLite |
| `npm run generate` | `generate.ts` — synthetic note generator (see above) |
| `npm test` | Vitest: rollup logic, cache invalidation, pool, question building, eval, truth-sampling determinism, deterministic verifier |
| `npm run typecheck` | Server and client type checks |
| `npm run build` / `npm start` | Production build and static serving from the backend |

## Architecture

```
client/            Vite + React 19. External store with useSyncExternalStore;
                   SSE events are coalesced into one update per animation frame.
                   Rows are virtualized by hand (28px rows, overscan 8).
server/
  index.ts         Fastify routes: /api/state, /api/events (SSE), /api/run,
                   /api/criteria, /api/eval, /api/claude/*, /api/runs/:id/*
  runner.ts        Run orchestration: cache lookup, bounded pool, SSE fan-out,
                   decision log, latency percentiles, 429 back-off
  pool.ts          Concurrency pool with a shared pause gate
  db.ts            better-sqlite3 schema and queries
  jev/types.ts     JevClient interface (the seam)
  jev/real.ts      TypeSafe SDK client; reads rate-limit headers
  jev/mock.ts      Fake client with jitter, negation-aware keyword heuristics
  jev/questions.ts Criterion -> noul()/score() question; answer -> probability
  claude.ts        Compiler (structured JSON output) and aggregate summarizer
  eval.ts          Truth functions for the default protocol; accuracy and
                   calibration
  protocol.ts      Default T2D protocol, 9 criteria
shared/
  types.ts         Domain types shared by both sides
  rollup.ts        met / not met / uncertain and eligible / ineligible / review,
                   flips, weighted score. Pure; tested.
  hash.ts          Criterion hash over the question-bearing fields
generate.ts        Synthetic note generator CLI (see above)
generator/
  rng.ts, dates.ts Seeded PRNG and reference-date helpers
  data.ts          Diagnosis/med/lab/procedure/family-history pools
  truth.ts         Deterministic truth sampling; tested
  prompts.ts       Render/verify prompt + JSON-schema construction
  render.ts        Batched, concurrent, resumable LLM rendering
  verify.ts        Deterministic fact check + LLM hallucination check; tested
  cost.ts, jsonl.ts, progress.ts   Pricing, incremental JSONL I/O, progress bar
```

### How a run works

1. `POST /api/run` creates a run and returns immediately.
2. For every note, the runner looks up cached answers by
   `(note id, criterion hash)`. Notes with every criterion cached are emitted
   at once. The rest go to a pool of `JEV_CONCURRENCY` workers.
3. Each worker makes **one `systemOne` call per note**: state is
   `{ note, patient: { age, sex } }` (demographics parsed from the note text
   itself, never from `truth`); questions are one per missing criterion, keyed
   by criterion id, `noul(...)` for boolean criteria and `score(...)` for
   graded ones.
4. A Noul's probability is `answers[id].noul`; its confidence is `|2p − 1|`.
   A Score's probability of "met" is the mass on the criterion's `metLevels`;
   its confidence is Jev's reported confidence.
5. Each note's result is pushed over SSE as it lands, cached, and logged to the
   `decisions` table with the exact question, probability, confidence,
   threshold, and latency. `GET /api/runs/:id/replay` rebuilds a run from that
   log with no API calls.
6. On 429 the SDK retries with back-off and honors `Retry-After`; the runner
   additionally pauses the whole pool so fifty workers do not retry at once.
   Rate-limit headers seen on responses are recorded in the run's stats.
7. When the pool drains the run records p50/p95/p99 latency, input tokens, and
   an estimated cost (`$0.042` per million input tokens, from the TypeSafe
   models page), and stores a per-note status snapshot for the Flipped filter.

### Rollup (in code, not in Jev)

For each criterion: `uncertain` if confidence is below the limit, else `met` if
`p ≥ 0.5`, else `not_met`. A note is `ineligible` if any inclusion is `not_met`
or any exclusion is `met`; otherwise `review` if anything is `uncertain`;
otherwise `eligible`. Moving the slider recomputes all of this in the browser.

### Rate limits

TypeSafe currently lists 1,200 requests per minute for Jev. A 500-note screen
issues up to 500 requests in a burst, so sustained repeated runs can hit 429.
The runner backs off and reports pauses in the header; the cache means a
re-run after an edit asks only what changed.

## Screenshots

| | |
|---|---|
| ![Day mode](docs/screenshots/desktop.png) | ![Night mode](docs/screenshots/dark.png) |
| ![Mid-run: the sweep and pending lamps](docs/screenshots/midrun.png) | ![Note inspector](docs/screenshots/inspector.png) |
| ![Evaluation drawer](docs/screenshots/eval.png) | ![Mobile](docs/screenshots/mobile.png) |

Screenshots were taken in `MOCK_JEV=true` mode against the bundled fixture
repeated to 500 rows; the answers are heuristic, not Jev's. The mock pool
defaults to 160 so that its 70–500 ms jitter lands a 500-note sweep near one
second; the live default of 50 is sized against TypeSafe's published rate
limits, and real sweep time is a property of Jev's latency and your limit.
