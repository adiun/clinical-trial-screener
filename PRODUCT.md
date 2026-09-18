# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript throughout. Node 20+ backend (Fastify or Express), Vite + React frontend, SQLite via better-sqlite3 for notes, criteria, results, and run logs. A single `npm run dev` starts both backend and frontend. `@typesafe-ai/sdk` for Jev (TypeSafe System One model, typed judgments and probabilities). Official `@anthropic-ai/sdk` for Claude.

Platform recorded as `web` by inference from the Vite + React choice; the user did not name a platform separately.

## Users

Primary user: clinical research coordinators at a study site. They have a batch of clinical notes and one trial's eligibility criteria, and need to find which notes indicate a patient who is likely eligible so they can decide who to follow up on.

No other audiences confirmed.

## Product Purpose

The product evaluates many clinical notes against a clinical trial's eligibility criteria and surfaces which notes indicate eligible patients. It exists to replace manual chart-by-chart screening with a batch run whose output a coordinator can act on. Success is a coordinator finishing a screening pass over a whole corpus of notes with a trustworthy, probability-ranked view of who is likely eligible.

## Positioning

Batch screening of free-text notes against criteria pulled from ClinicalTrials.gov, with a calibrated probability of eligibility per patient rather than a binary flag. Probabilities come from Jev's typed judgments, with Claude available for reasoning over notes and criteria text.

## Operating Context

- Input notes arrive as a JSONL file, one clinical note per line. This is the confirmed ingestion format; no other source is confirmed.
- Eligibility criteria are sourced from ClinicalTrials.gov registry data.
- A screening run processes the whole batch and persists notes, criteria, results, and run logs in SQLite.
- Runs locally from a single dev command; no deployment target has been named.

## Capabilities and Constraints

Confirmed:
- Ingest a JSONL corpus of clinical notes.
- Load a trial's eligibility criteria from ClinicalTrials.gov.
- Evaluate every note against the criteria and produce a per-patient probability of eligibility.
- Persist notes, criteria, results, and run logs.

Data sensitivity: synthetic or demo data only. No real patient data. Notes may be sent to hosted model APIs (TypeSafe, Anthropic) without a PHI boundary. If real or de-identified data is ever introduced, this constraint must be revisited before any model call ships.

Terminology: "note" is one line of the JSONL corpus and stands for one patient encounter record. "Criteria" means the trial's inclusion and exclusion criteria. "Run" is one evaluation of a corpus against one trial's criteria.

Explicitly undecided:
- Whether results also show per-criterion verdicts with quoted evidence, a run audit view, or an export for outreach. The coordinator's confirmed trust signal is confidence/probability; the rest was offered and not selected. Treat as not required until asked for.
- The exact division of labor between Jev and Claude in the evaluation pipeline.
- Fastify versus Express.
- Deployment target and hosting.

## Evidence on Hand

None yet. The repository is empty apart from git. There is no notes corpus, no sample JSONL file, no trial criteria fixture, no logo, no name beyond the repo name, no testimonials, no benchmarks, and no customers. Future work must not fabricate any of these; a synthetic demo corpus is acceptable and expected, and must be labeled as synthetic.

## Product Principles

1. **Whole-batch first.** The unit of work is a corpus run, not a single note. Every workflow should assume many notes and one set of criteria.
2. **Probability over verdict.** The output a coordinator relies on is a calibrated likelihood. Never collapse it to a bare yes/no without showing the number behind it.
3. **Criteria are external truth.** Eligibility criteria come from ClinicalTrials.gov and are shown as sourced, not paraphrased into something a coordinator cannot trace back.
4. **Persist every run.** Notes, criteria, results, and logs are stored so a run can be revisited. Nothing is fire-and-forget.
5. **Synthetic data, honestly labeled.** Demo data is fine and must always read as demo data.
