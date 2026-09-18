---
version: 1
slug: "client-src-app-tsx"
primary_target: "client/src/App.tsx"
related_targets: []
---

# Surface: screener workstation (client/src/App.tsx)

Scope: the whole single-page app. Visitor mode: Operate.

Audience and job: a research coordinator with ~500 synthetic clinical notes and one trial protocol, screening the whole batch at once, watching results land, tuning the confidence limit, editing criteria, and reading who flipped.

Task and action: press Run (or edit a criterion) and read the table. Proof: the run finishing in about a second with every cell filling in arrival order.

Constraints: dense, calm, instrument-like; light and dark themes; one restrained accent; status readable without color alone; motion only for arrival, counts, and column dim/refill; the 500-row table is the hero and is virtualized; criteria feel like editing a spec; no cards-inside-cards, no gradients, no empty-state illustrations; synthetic-data banner.

## Direction contract

THESIS: The screener is a bedside multi-parameter monitor for a trial. Criteria are channels with an alarm limit, notes are beds, and a run is the erase-bar sweep crossing the screen while values fill in behind it. It refuses the dashboard arrangement of KPI cards floating over a bordered grid.

OWN-WORLD: Day-mode pale gray ground (light) and night-mode near-black ground (dark), slate ink, one cyan accent reserved for the active channel and the sweep. Alarm semantics (red ineligible, amber review, green eligible) live only in a status glyph and its word. Square lamp glyphs: filled = met, hollow = not met, half-filled = uncertain, dim hollow = pending. Barlow Semi Condensed for channel labels and headings, small uppercase tracked labels above values as a monitor does. Martian Mono, narrowed, tabular figures, for every value. Hairline rules, no cards, no gradients, no shadows except the inspector's.

STORY: The coordinator sees 500 beds waiting, presses Run, watches the cyan erase bar sweep down the visible rows while lamps light behind it in under a second, reads the three counts in the numerics strip flip into place, drags the alarm limit and watches Review shrink or grow instantly, edits a channel and sees its column dim and refill.

FIRST VIEWPORT (1440x900): A 64px numerics strip across the top: ELIGIBLE / INELIGIBLE / REVIEW as large mono values with small labels above, then the limit slider with its value, the sweep timer "500/500 · 0.84s", p50/p99 latency, estimated cost, theme switch, auto-run toggle, and the cyan Run control at the right end. Beneath, a thin synthetic-data notice. Left rail, 360px: the plain-English protocol box, then criteria as numbered channel rows, each with label, kind tag, primitive, and an inline-editable question line. Right: the bed grid, sticky header row with nine channel abbreviations, 28px rows: bed id in mono, status field (glyph plus word), nine lamp cells. Row click slides a 440px inspector from the right edge.

FORM: Bedside patient monitor, position 2 on my ordered grounded list, chosen by the user from the safer-register round; seed key f2f419c8. Signature interaction: the erase-bar sweep with a lamp blip decaying over 400ms as each result lands. Motion grammar: arrival blip, count digit cross-fade, column dim/refill. Nothing else moves.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Open decisions

Inspector width and eval drawer height may adjust after inspection. Mobile below 900px stacks table first, criteria below, inspector full-width.
