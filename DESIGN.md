---
name: Eligibility Screener
description: A bedside multi-parameter monitor for trial screening, drawn warm; criteria are channels, notes are beds, a run is the erase-bar sweep.
colors:
  channel-teal: "#146964"
  channel-teal-night: "#5ccbc4"
  on-teal: "#ffffff"
  on-teal-night: "#0f1a19"
  teal-wash: "rgba(20, 105, 100, 0.12)"
  teal-wash-night: "rgba(92, 203, 196, 0.16)"
  met-green: "#226640"
  met-green-night: "#6ccb95"
  met-green-wash: "rgba(34, 102, 64, 0.13)"
  met-green-wash-night: "rgba(108, 203, 149, 0.16)"
  alarm-red: "#a0392e"
  alarm-red-night: "#f2887a"
  alarm-red-wash: "rgba(160, 57, 46, 0.12)"
  alarm-red-wash-night: "rgba(242, 136, 122, 0.16)"
  review-amber: "#8a5a05"
  review-amber-night: "#f0bf4f"
  review-amber-wash: "rgba(196, 140, 40, 0.16)"
  review-amber-wash-night: "rgba(240, 191, 79, 0.16)"
  on-status: "#ffffff"
  paper-ground: "#f4f1eb"
  night-ground: "#15120f"
  panel-cream: "#fffdf9"
  panel-night: "#1d1916"
  rail-linen: "#ece8e0"
  rail-night: "#242019"
  warm-ink: "#2a2622"
  warm-ink-night: "#ede7df"
  warm-ink-2: "#5a534c"
  warm-ink-2-night: "#b3aaa0"
  warm-ink-3: "#6b635d"
  warm-ink-3-night: "#8c847b"
  hairline: "#e3ddd3"
  hairline-night: "#302a25"
  hairline-strong: "#cbc3b7"
  hairline-strong-night: "#453d36"
  lamp-off: "#cbc3b7"
  lamp-off-night: "#3d352e"
  selection: "rgba(20, 105, 100, 0.22)"
  selection-night: "rgba(92, 203, 196, 0.3)"
typography:
  readout:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
  value:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "1rem"
    fontWeight: 500
    fontFeature: "tnum"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    fontFeature: "tnum"
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 450
    lineHeight: 1.4
  secondary:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 450
    lineHeight: 1.45
  control:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 550
    letterSpacing: "0"
  label:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 550
    letterSpacing: "0.01em"
  tag:
    fontFamily: "Figtree, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0.04em"
  caption:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "9px"
    fontWeight: 400
rounded:
  edge: "6px"
  small: "4px"
  thumb: "3px"
  bar: "2px"
  pill: "7px"
  dot: "50%"
spacing:
  u: "4px"
  u2: "8px"
  u3: "12px"
  u4: "16px"
  u5: "20px"
  u6: "24px"
  row: "32px"
  control: "30px"
  header: "68px"
  notice: "26px"
  rail: "372px"
  inspector: "460px"
components:
  button-run:
    backgroundColor: "{colors.channel-teal}"
    textColor: "{colors.on-teal}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "0 16px 0 12px"
    height: "34px"
  button-run-running:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink}"
  button-primary:
    backgroundColor: "{colors.channel-teal}"
    textColor: "{colors.on-teal}"
    typography: "{typography.control}"
    rounded: "{rounded.edge}"
    padding: "0 11px"
    height: "{spacing.control}"
  button-icon:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.edge}"
    padding: "0 11px"
    height: "{spacing.control}"
  button-icon-hover:
    backgroundColor: "{colors.rail-linen}"
    textColor: "{colors.warm-ink}"
  button-icon-active:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.channel-teal}"
  button-text:
    textColor: "{colors.channel-teal}"
    typography: "{typography.control}"
    padding: "0 4px"
    height: "{spacing.control}"
  segment:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink-2}"
    typography: "{typography.control}"
    height: "28px"
    padding: "0 11px"
  segment-on:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.channel-teal}"
  tag-kind:
    backgroundColor: "{colors.rail-linen}"
    textColor: "{colors.warm-ink-2}"
    typography: "{typography.tag}"
    rounded: "{rounded.small}"
    padding: "3px 6px"
  tag-inclusion:
    backgroundColor: "{colors.met-green-wash}"
    textColor: "{colors.met-green}"
  tag-exclusion:
    backgroundColor: "{colors.alarm-red-wash}"
    textColor: "{colors.alarm-red}"
  tag-primitive:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.channel-teal}"
  field-describe:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "8px 10px"
  field-inline:
    typography: "{typography.secondary}"
    rounded: "{rounded.edge}"
    padding: "2px 4px"
  field-inline-focus:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink}"
  notice:
    backgroundColor: "{colors.review-amber-wash}"
    textColor: "{colors.warm-ink-2}"
    typography: "{typography.label}"
    padding: "4px 16px"
    height: "{spacing.notice}"
  bed-row:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink}"
    height: "{spacing.row}"
    padding: "0 16px"
  bed-row-hover:
    backgroundColor: "{colors.rail-linen}"
  bed-row-selected:
    backgroundColor: "{colors.teal-wash}"
  inspector:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.warm-ink}"
    width: "{spacing.inspector}"
  toast:
    backgroundColor: "{colors.warm-ink}"
    textColor: "{colors.panel-cream}"
    typography: "{typography.control}"
    rounded: "{rounded.edge}"
    padding: "10px 16px"
  toast-error:
    backgroundColor: "{colors.alarm-red}"
    textColor: "{colors.on-status}"
---

# Design System: Eligibility Screener

## Overview

**Creative North Star: "The Bedside Monitor"**

The screener is a multi-parameter patient monitor pointed at a clinical trial. Each eligibility criterion is a channel; each clinical note is a bed; the confidence threshold is an alarm limit; a run is the erase bar sweeping down the bed grid while lamps light behind it. The whole surface is one instrument, laid out as a monitor is: a numerics strip along the top with large mono readouts under small labels, a thin advisory line beneath, a protocol rail to the left, and the dense bed grid filling the rest. It refuses the dashboard arrangement of KPI cards floating over a bordered table.

The instrument is drawn warm. The monitor grammar (label above value, lamps, the sweep) stays, but the voice is a friendly one: full-width faces at generous weights, sentence-case labels, paper and cream grounds instead of slate, tinted tags instead of outlined ones, and corners eased to 6px. Nothing shouts. The refit happened after a user review found the condensed type too thin and narrow to read and the whole look too hard-edged.

Two scenes light the same instrument. Day mode (the default; a research office with daylight on an external display) sits warm ink on cream panels over a paper ground. Night mode is the same hardware with the room lights off: warm near-black ground, luminous teal, brightened status hues. Nothing changes shape between scenes, only luminance. The build resolves the scene before first paint from a stored preference or the OS setting, so the instrument never flashes.

Density is high and even: a 4px module, 32px bed rows, 30px controls, hairline rules for every boundary. There are no cards, no gradients, and a single lifted surface (the inspector). Color carries meaning, never decoration: one teal for the active channel, the sweep, focus, and selection; red, amber, and green only inside a status glyph and its word, or as the wash behind a tag whose letters name the kind. Motion is confined to the run: an arrival blip, a digit cross-fade, a column dim, the sweep itself, and a short panel entry. Nothing else moves.

**Key Characteristics:**
- Monitor grammar: label above value, mono for every figure, a humanist sans for every word.
- One accent (teal) reserved for the live channel, the sweep, focus, and selection.
- Alarm semantics (red / amber / green) live only in a lamp or status glyph plus its word, or a kind tag's wash.
- Square lamp glyphs encode state by shape: filled, hollow, half-filled, dashed hollow.
- Hairline-rule construction: no cards, no gradients, one shadow.
- Warm neutrals (paper, cream, linen, warm ink) in both scenes.
- Two luminance scenes (day default, night) on identical geometry.
- Motion vocabulary of five moves, all tied to the run.

## Colors

A warm-neutral instrument palette with one teal accent and three alarm hues that stay inside their glyphs and tags.

### Primary
- **Channel Teal** (`{colors.channel-teal}` day, `{colors.channel-teal-night}` night): the active channel header while it is being asked, the erase bar, the Run control, focus outlines, the slider thumb, the caret, selection washes, the "on" filter segment, the primitive tag, and text links. It marks what the instrument is doing right now, never a status.
- **Teal Wash** (`{colors.teal-wash}`): the 12% tint under a selected bed row, an asking criterion row, an active icon button, the on segment, the primitive tag, the live mode tag, and the 6px halo above the erase bar.

### Secondary (status hues)
- **Met Green** (`{colors.met-green}` day, `{colors.met-green-night}` night): a lamp whose answer favors eligibility, the Eligible readout and status word, the INCL tag text; its 13% wash is the INCL tag ground.
- **Alarm Red** (`{colors.alarm-red}` day, `{colors.alarm-red-night}` night): a lamp whose answer disfavors eligibility, the Ineligible readout and status word, the EXCL tag text on its 12% wash, the danger hover on the delete icon button, the error toast.
- **Review Amber** (`{colors.review-amber}` day, `{colors.review-amber-night}` night): an uncertain lamp, the Review readout and status word, the paused telemetry value, the synthetic-data notice dot. Its 16% wash is the notice band's ground.
- **On Status** (`{colors.on-status}`): the check mark drawn over a filled Eligible glyph and the text of an error toast. The only white that stays white in night mode.

### Neutral
- **Paper Ground / Night Ground** (`{colors.paper-ground}` / `{colors.night-ground}`): the page and shell background.
- **Panel Cream / Panel Night** (`{colors.panel-cream}` / `{colors.panel-night}`): the numerics strip, the bed grid, the inspector, drawers, inputs, and outlined buttons.
- **Rail Linen / Rail Night** (`{colors.rail-linen}` / `{colors.rail-night}`): the protocol rail, row hover, control hover, the neutral tag ground, the Claude summary block.
- **Warm Ink** (`{colors.warm-ink}`): primary text, the Run button while running, the toast ground.
- **Warm Ink 2** (`{colors.warm-ink-2}`): secondary text, control labels at rest, bed ids, descriptions, the meter fill, neutral tag text.
- **Warm Ink 3** (`{colors.warm-ink-3}`): labels, indices, placeholders, hashes, the select chevron, the pending status word.
- **Hairline / Hairline Strong** (`{colors.hairline}` / `{colors.hairline-strong}`): every 1px rule; the strong step for the slider track, the switch track at rest, the scrollbar thumb, control hover borders, and the drawer's bottom edge.
- **Lamp Off** (`{colors.lamp-off}`): the dashed pending lamp and pending status glyph.

### Named Rules
**The One Teal Rule.** Teal means "live": the channel being asked, the sweep, the Run control, focus, selection, the chosen filter. It never encodes a result. If a value could be read as a status, it is green, red, or amber inside a glyph, not teal.

**The Glyph-Plus-Word Rule.** Red, amber, and green appear only on a lamp, a status glyph with its word, a readout digit, or a kind tag whose letters name the kind. The shape or the word must carry the meaning when the color is removed.

**The Warm Neutral Rule.** Every gray in the system leans toward paper: no cool slate, no pure white panel, no pure black ground. Status washes sit on cream, so they read as tinted paper rather than badges.

**The Scene Swap Rule.** Night mode is set by `data-theme="dark"` on the root and swaps only color tokens. Geometry, type, rules, and motion are identical in both scenes.

## Typography

**Display / Readout Font:** IBM Plex Mono (with ui-monospace, SF Mono, Menlo, monospace), static 400, 500, 600, full width
**Body / Label Font:** Figtree (with Avenir Next, Segoe UI, system-ui, sans-serif), variable weight 300 to 900
**Label/Mono Font:** every numeric or code-like value uses the `.data` class: IBM Plex Mono 500, tabular figures

**Character:** A monitor's two voices, both warm. Figtree is a rounded humanist sans with open apertures and a large x-height, set at intermediate variable weights (450 body, 550 medium, 650 strong) so text has presence at 13 and 14px without going heavy. IBM Plex Mono is the instrument's display: wide, soft-cornered, and legible, so every count, id, latency, probability, cost, and timer sits in tabular figures that columns never jitter around. Neither face is condensed, tracked wide, or set in uppercase outside four-letter kind codes. Both faces are self-hosted as woff2 subsets (latin, latin-ext) with `font-display: swap`.

### Hierarchy
- **Readout** (IBM Plex Mono 500, 1.75rem, line-height 1): the three counts in the numerics strip. Digits cross-fade when they change.
- **Value** (IBM Plex Mono 500, 1rem): the confidence-limit value beside the slider.
- **Data** (IBM Plex Mono 500, 0.8125rem; 0.75rem in channel headers, 0.875rem for telemetry values): bed ids, sweep timer, latency, cost, probabilities, hashes, row counts.
- **Code** (IBM Plex Mono 400, 0.8125rem, line-height 1.55): the JSON drawer.
- **Caption** (IBM Plex Mono 400, 9px SVG text): calibration chart axis labels.
- **Title** (Figtree 650, 0.9375rem, line-height 1.3): brand name, protocol name, inspector id, drawer title.
- **Body** (Figtree 450, 0.875rem, line-height 1.4; 1.55 in the note text, drawer notes, and the Claude summary, max 72ch): the default page text, the describe box; the criterion name at 650.
- **Secondary** (Figtree 450, 0.8125rem, line-height 1.45): criterion questions and descriptions, verdict questions, levels, the eval table.
- **Control** (Figtree 550, 0.8125rem): every button, segment, switch, and select label; Run at 0.875rem 650; the on segment at 650.
- **Label** (Figtree 550, 0.75rem, tracking 0.01em, sentence case, Warm Ink 3): the label that sits above a readout, a field, or a column, as a monitor prints its channel names.
- **Tag** (Figtree 650, 0.6875rem, tracking 0.04em, line-height 1, uppercase, tinted ground, no border): INCL / EXCL kind tags, primitive tags. The mode tag is 550 at 0.03em on Rail Linen, sentence case as delivered by the mode name.

### Named Rules
**The Mono-for-Values Rule.** Any figure that can change while the user watches is set in IBM Plex Mono with tabular figures. Words are never mono; numbers are never sans.

**The Label-Above Rule.** The 12px sentence-case label names the value, field, or column directly beneath it. It is a monitor's channel label, not an editorial eyebrow: it never sits above a heading or a paragraph.

**The No-Shouting Rule.** Uppercase is reserved for four-letter kind and primitive codes. Every other label, control, and heading is sentence case at tracking 0.01em or tighter; weight, not tracking or case, carries emphasis.

## Layout

The shell is a three-row grid: the numerics strip (68px), the advisory notice (26px minimum, grows to fit), and the panes. The panes split into a 372px protocol rail and a fluid bed grid. The bed grid is itself three rows: a wrapping tools row (40px minimum), a sticky 36px channel header, and a virtualized body of absolutely positioned 32px rows, each a CSS grid whose column template the grid computes from the channel count. The inspector is a 460px fixed panel from the right edge, pinned below the strip and notice; drawers drop from beneath the notice and span from the rail's right edge to the inspector's left edge, capped at `min(70vh, 640px)`.

Rhythm is a 4px module. Observed steps: 4, 6, 8, 10, 12, 16, 20, 24px. Horizontal padding inside strip cells, rail sections, grid rows, and panel heads is 16px (12px in the strip after the header-fit pass, and in rows below 900px). Vertical padding on rail sections and panel heads is 8 to 12px. Controls are 30px tall (28px inside a segmented control, 34px for Run). Numerics strip cells are separated by 1px right rules, not gaps.

Density is high and flat: 32px rows with a 10px lamp centered in each channel cell, no row striping, hover and selection shown by ground color only.

Responsive behavior is deletion first, then reflow. At or below 1320px the third telemetry item hides; at 1180px the second hides too, switch text and icon-button captions drop to icon-only. At 900px the strip wraps to 56px cells with bottom rules, the rail moves below the grid and the grid takes 72vh (minimum 420px), the flip column and row count hide, cell padding falls to 12px, ids drop to 12px, meters narrow to 52px, and both overlays go full-viewport from the top.

## Elevation & Depth

The instrument is flat. Depth is drawn with hairline rules and ground steps (Paper Ground under Panel Cream under the rail's Rail Linen), never with shadows or gradients. One surface lifts: the inspector, which slides in over the grid and carries the system's single shadow token. Drawers sit on a flat edge (1px Hairline Strong bottom rule) so the inspector keeps the lift. Focus is a 2px teal outline offset 1px; grid rows use an inset 2px teal left bar instead; the slider thumb uses a two-ring 2px panel / 4px teal ring.

### Shadow Vocabulary
- **Inspector lift** (`box-shadow: 0 12px 32px -12px rgba(42, 38, 34, 0.28), 0 2px 6px -2px rgba(42, 38, 34, 0.16)` day; `0 16px 40px -12px rgba(0, 0, 0, 0.7), 0 2px 8px -2px rgba(0, 0, 0, 0.5)` night): the inspector panel.

### Named Rules
**The Single Lift Rule.** Only the inspector floats. Every other boundary is a 1px rule, and every other layer is a ground step.

## Shapes

Softly rounded, never pill-shaped. Buttons, inputs, the toast, the describe box, the select, and the Claude summary block take a 6px radius; tags, the weight field, and the mode tag take 4px; segments inside a segmented control are square (0) with the group's 6px outer radius clipping them. The slider thumb is an 8x18px bar with a 3px radius. Meter and level bars are 4px tall with a 2px radius. The only pill is the 26x14px switch track (7px) with a 10px round thumb. Lamps are 10px SVG squares with a 1px corner (0.75px when hollow); status glyphs are 12px squares with a 1.5px corner. The notice mark (7px) and the flipped-row marker (5px) are round dots. Scrollbars are 8px with a 4px thumb. Borders are always 1px; the only 2px strokes are focus outlines and the erase bar.

## Components

### Buttons
Monitor controls: short, calm, mostly outlined, one filled.
- **Shape:** 6px radius, 30px tall, 11px horizontal padding, 6px icon gap, 13px 550, no tracking.
- **Run:** Channel Teal ground, On Teal text, 34px tall, 14px 650, 16px right padding; hover brightens 8%. While running it inverts to Panel Cream ground, Warm Ink text, Hairline Strong border, and its icon becomes a stop square.
- **Primary:** same fill as Run at 30px (Compile with Claude).
- **Icon button:** Panel Cream ground, 1px Hairline border, Warm Ink 2 text; hover to Warm Ink text, Hairline Strong border, and Rail Linen ground; active to Channel Teal text and border on Teal Wash; `.danger` hovers to Alarm Red text and border. Captions hide below 1180px.
- **Text button:** no ground or border, Channel Teal text, 4px padding; hover underlines at 3px offset.
- **Segmented control:** 1px Hairline group outline, 28px segments split by 1px rules; hover to Rail Linen; the on segment is Channel Teal 650 on Teal Wash.
- **Focus:** 2px Channel Teal outline, 1px offset. State color transitions run 150ms.

### Chips (tags)
- **Style:** 11px 650 uppercase tracked 0.04em, 3px 6px padding, 4px radius, tinted ground, no border. Neutral tags are Warm Ink 2 on Rail Linen.
- **State:** INCL takes Met Green on its wash; EXCL takes Alarm Red on its wash; the primitive tag (NOUL, SCORE) takes Channel Teal on Teal Wash; the mode tag is Warm Ink 2 550 on Rail Linen, turning teal on Teal Wash when live.

### Cards / Containers
There are no cards. Regions are hairline-ruled panels on ground steps.
- **Numerics strip:** Panel Cream, 68px, cells separated by 1px right rules, 12px padding.
- **Protocol rail:** Rail Linen, 372px, sections split by 1px rules, 12px 16px padding.
- **Bed grid:** Panel Cream; tools row and channel header ruled beneath; rows ruled beneath.
- **Notice band:** Review Amber wash, 7px amber dot, 12px 550 text, 4px vertical padding, wraps rather than truncates.
- **Inspector:** Panel Cream, 1px Hairline left rule, single shadow, sticky ruled head, note text at 14px/1.55 max 72ch, verdict list ruled per item.
- **Drawer:** Panel Cream, 1px Hairline Strong bottom edge, no shadow, ruled head, 16px body padding.
- **Claude summary:** Rail Linen block, 6px radius, 12px 14px padding, 14px/1.55, max 72ch.
- **Toast:** Warm Ink ground with Panel Cream text (error: Alarm Red with On Status text), 10px 16px, 6px radius, bottom-centered 24px up.

### Inputs / Fields
- **Describe box:** Panel Cream, 1px Hairline border, 6px radius, 8px 10px padding, 14px/1.45, vertical resize, 64px minimum; placeholder Warm Ink 3; focus swaps the border to Channel Teal with no outline.
- **Inline editable (criterion question, name):** transparent with a transparent 1px border and a -4px negative margin so text aligns at rest; hover shows a Hairline border; focus shows Channel Teal border on Panel Cream ground and lifts text to Warm Ink. Sizes to content. The name truncates with an ellipsis at rest and wraps while focused.
- **Weight and key fields:** 26px / 30px tall, Hairline border, Panel Cream, 13px, teal border on focus.
- **Select:** 30px, Hairline border (Hairline Strong on hover), Panel Cream, inline chevron in Warm Ink 3, 13px 550.
- **Range (alarm limit):** 120px wide, 2px Hairline Strong track, 8x18px teal thumb with 3px radius, `ew-resize` cursor; focus draws a 2px panel ring and 4px teal ring on the thumb.
- **Switch:** 26x14px track (Hairline Strong, teal when on), 10px panel thumb sliding 12px at 150ms; 2px teal outline on focus.

### Navigation
The instrument has no page navigation. Filtering is the segmented control (All / Eligible / Ineligible / Review / Flipped) plus a sort select in the grid tools row; overlays are the inspector (row click) and the Eval, Claude, and JSON drawers opened from icon buttons in the strip.

### Lamp (signature)
A 10px SVG square whose shape encodes whether the condition holds and whose color encodes what that means for eligibility:
- **Met:** filled square, 1px corner.
- **Not met:** hollow square, 1.5px stroke, 0.75px corner.
- **Uncertain:** hollow square with its left half filled.
- **Pending:** hollow square, 1px stroke, dashed 1.5/1.5, Lamp Off.
Color: Met Green when the answer favors eligibility (met for an inclusion, not met for an exclusion), Alarm Red when it disfavors, Review Amber when uncertain. A lamp whose criterion has been edited since it was asked is stale and sits at 0.55 opacity until the channel refills. Each arrival blips: color flashes Channel Teal and the glyph scales from 1.35 back to 1 over 420ms on the ease-out curve.

### Status field (signature)
A 12px glyph plus its word, 13px 650. Eligible is a filled Met Green square with an On Status check; Ineligible a hollow Alarm Red square with an X; Review a hollow Review Amber square with its left half filled; Pending a dashed Warm Ink 3 square with the word at 550. The compact variant (mobile) keeps the glyph and drops the word to a column header of "St."

### Readout (signature)
A label over a 28px mono count. Each digit lives in a 0.62em slot; when a digit changes, the new one rises from 45% below while the old lifts 45% up and fades, both over 420ms ease-out. Slots are keyed from the right so 99 to 100 grows leftward. Eligible, Ineligible, and Review readouts take their status hue.

### Erase bar (signature)
A 2px Channel Teal bar with a 6px Teal Wash halo above it, absolutely positioned in the grid canvas. During a run it tracks progress down the visible rows (`transform: translateY`, 90ms linear) and lamps blip in behind it; at rest it fades out over 600ms after a 300ms hold. The channel header being asked turns teal while its column refills.

### Motion vocabulary
Exactly five moves, all on `cubic-bezier(0.16, 1, 0.3, 1)`:
1. **Arrival blip**, 420ms: lamp flashes teal and settles from 1.35 scale.
2. **Digit cross-fade**, 420ms: readout digits rise in / lift out.
3. **Column dim**: stale lamps drop to 0.55 opacity until refilled (color and opacity at 150ms).
4. **Erase-bar sweep**: 90ms linear travel, 600ms fade after a 300ms delay.
5. **Panel entry**, 200ms: inspector slides 24px from the right; drawers and toasts drop 12px.
Control state colors, the disclose chevron's rotation, and the switch thumb transition at 150ms. Under `prefers-reduced-motion` every keyframe animation is removed, the sweep's opacity snaps in 1ms, and all transitions clamp to 80ms; states still change, nothing travels.

## Do's and Don'ts

### Do:
- **Do** set every number that can change in IBM Plex Mono 500 with tabular figures (`.data`).
- **Do** place the 12px sentence-case label directly above the value or column it names, in Warm Ink 3.
- **Do** separate regions with 1px Hairline rules and ground steps (Paper Ground / Panel Cream / Rail Linen); reserve the shadow token for the inspector.
- **Do** keep Channel Teal for live state only: the asking channel, the sweep, Run, focus, selection, the chosen filter.
- **Do** pair every red, amber, or green with a glyph shape or word that carries the same meaning.
- **Do** keep controls at 30px tall with 6px corners and 13px 550 sentence-case labels.
- **Do** use Figtree's intermediate weights (450 / 550 / 650) rather than jumping to 700 for emphasis.
- **Do** define night mode by swapping the color tokens under `data-theme="dark"` and nothing else.
- **Do** confine motion to the five moves above at 420 / 420 / 150 / 90+600 / 200ms on the ease-out curve.

### Don't:
- **Don't** introduce cards, gradients, or shadows on any surface but the inspector.
- **Don't** use Channel Teal to mean eligible, ineligible, or any other result.
- **Don't** convey a status by color alone; the lamp shape or the status word must survive grayscale.
- **Don't** add motion outside the run: no hover lifts, no scroll effects, no ambient animation.
- **Don't** set words in the mono face or figures in the sans.
- **Don't** condense, narrow, or track-out any text, and don't set anything but four-letter codes in uppercase.
- **Don't** invert a control to solid ink for its on state; the on state is Teal on Teal Wash.
- **Don't** reach for cool grays or pure white; every neutral is warm.
- **Don't** round corners beyond 6px except the switch pill, the scrollbar thumb, and the two dots.
- **Don't** put the label above a heading or paragraph as an editorial eyebrow.
