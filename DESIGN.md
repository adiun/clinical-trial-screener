---
name: Eligibility Screener
description: A bedside multi-parameter monitor for trial screening; criteria are channels, notes are beds, a run is the erase-bar sweep.
colors:
  channel-cyan: "#0a6f83"
  channel-cyan-night: "#3cc6dd"
  on-cyan: "#ffffff"
  on-cyan-night: "#061014"
  cyan-wash: "rgba(10, 111, 131, 0.12)"
  cyan-wash-night: "rgba(60, 198, 221, 0.16)"
  met-green: "#157347"
  met-green-night: "#4cc38a"
  met-green-wash: "rgba(21, 115, 71, 0.14)"
  met-green-wash-night: "rgba(76, 195, 138, 0.16)"
  alarm-red: "#b02f27"
  alarm-red-night: "#f0665c"
  alarm-red-wash: "rgba(176, 47, 39, 0.12)"
  alarm-red-wash-night: "rgba(240, 102, 92, 0.16)"
  review-amber: "#835500"
  review-amber-night: "#f0b323"
  review-amber-wash: "rgba(131, 85, 0, 0.16)"
  review-amber-wash-night: "rgba(240, 179, 35, 0.16)"
  on-status: "#ffffff"
  daylight-ground: "#f1f4f5"
  night-ground: "#0a0d10"
  panel-white: "#ffffff"
  panel-night: "#11161a"
  rail-gray: "#e9edef"
  rail-night: "#171d22"
  slate-ink: "#171e24"
  slate-ink-night: "#e6ebee"
  slate-ink-2: "#4c5761"
  slate-ink-2-night: "#a3aeb6"
  slate-ink-3: "#5f6b74"
  slate-ink-3-night: "#7d8993"
  hairline: "#d3dadf"
  hairline-night: "#232b31"
  hairline-strong: "#b8c2c8"
  hairline-strong-night: "#34404a"
  lamp-off: "#c2cad0"
  lamp-off-night: "#2b353d"
  selection: "rgba(10, 111, 131, 0.22)"
  selection-night: "rgba(60, 198, 221, 0.3)"
typography:
  readout:
    fontFamily: "Martian Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
    fontVariation: "wdth 87.5"
  value:
    fontFamily: "Martian Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "1rem"
    fontWeight: 500
    fontFeature: "tnum"
    fontVariation: "wdth 87.5"
  data:
    fontFamily: "Martian Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
    fontVariation: "wdth 87.5"
  title:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
  secondary:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  tag:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  edge: "2px"
  thumb: "1px"
  pill: "7px"
spacing:
  u: "4px"
  u2: "8px"
  u3: "12px"
  u4: "16px"
  u5: "20px"
  u6: "24px"
  row: "28px"
  control: "28px"
  header: "64px"
  notice: "24px"
  rail: "360px"
  inspector: "440px"
components:
  button-run:
    backgroundColor: "{colors.channel-cyan}"
    textColor: "{colors.on-cyan}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "0 14px 0 10px"
    height: "32px"
  button-run-running:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink}"
  button-primary:
    backgroundColor: "{colors.channel-cyan}"
    textColor: "{colors.on-cyan}"
    typography: "{typography.control}"
    rounded: "{rounded.edge}"
    padding: "0 10px"
    height: "{spacing.control}"
  button-icon:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.edge}"
    padding: "0 10px"
    height: "{spacing.control}"
  button-icon-hover:
    textColor: "{colors.slate-ink}"
  button-icon-active:
    backgroundColor: "{colors.cyan-wash}"
    textColor: "{colors.channel-cyan}"
  button-text:
    textColor: "{colors.channel-cyan}"
    typography: "{typography.control}"
    padding: "0 4px"
    height: "{spacing.control}"
  segment:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink-2}"
    typography: "{typography.control}"
    height: "26px"
    padding: "0 10px"
  segment-on:
    backgroundColor: "{colors.slate-ink}"
    textColor: "{colors.panel-white}"
  tag-kind:
    textColor: "{colors.slate-ink-2}"
    typography: "{typography.tag}"
    rounded: "{rounded.edge}"
    padding: "2px 5px"
  tag-inclusion:
    textColor: "{colors.met-green}"
  tag-exclusion:
    textColor: "{colors.alarm-red}"
  tag-primitive:
    textColor: "{colors.channel-cyan}"
  field-describe:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "8px 10px"
  field-inline:
    typography: "{typography.secondary}"
    rounded: "{rounded.edge}"
    padding: "2px 4px"
  field-inline-focus:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink}"
  notice:
    backgroundColor: "{colors.review-amber-wash}"
    textColor: "{colors.slate-ink-2}"
    typography: "{typography.label}"
    padding: "4px 16px"
    height: "{spacing.notice}"
  bed-row:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink}"
    height: "{spacing.row}"
    padding: "0 16px"
  bed-row-hover:
    backgroundColor: "{colors.rail-gray}"
  bed-row-selected:
    backgroundColor: "{colors.cyan-wash}"
  inspector:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.slate-ink}"
    width: "{spacing.inspector}"
  toast:
    backgroundColor: "{colors.slate-ink}"
    textColor: "{colors.panel-white}"
    typography: "{typography.secondary}"
    rounded: "{rounded.edge}"
    padding: "8px 14px"
  toast-error:
    backgroundColor: "{colors.alarm-red}"
    textColor: "{colors.on-status}"
---

# Design System: Eligibility Screener

## Overview

**Creative North Star: "The Bedside Monitor"**

The screener is a multi-parameter patient monitor pointed at a clinical trial. Each eligibility criterion is a channel; each clinical note is a bed; the confidence threshold is an alarm limit; a run is the erase bar sweeping down the bed grid while lamps light behind it. The whole surface is one instrument, laid out as a monitor is: a numerics strip along the top with large mono readouts under small tracked labels, a thin advisory line beneath, a protocol rail to the left, and the dense bed grid filling the rest. It refuses the dashboard arrangement of KPI cards floating over a bordered table.

Two scenes light the same instrument. Day mode (the default; a research office with daylight on an external display) sits pale gray ink on near-white panels. Night mode is the same hardware with the room lights off: near-black ground, luminous cyan, brightened status hues. Nothing changes shape between scenes, only luminance. The build resolves the scene before first paint from a stored preference or the OS setting, so the instrument never flashes.

Density is high and even: a 4px module, 28px bed rows, 28px controls, hairline rules for every boundary. There are no cards, no gradients, and a single lifted surface (the inspector). Color carries meaning, never decoration: one cyan for the active channel, the sweep, focus, and selection; red, amber, and green only inside a status glyph and its word. Motion is confined to the run: an arrival blip, a digit cross-fade, a column dim, the sweep itself, and a short panel entry. Nothing else moves.

**Key Characteristics:**
- Monitor grammar: label above value, mono for every figure, condensed sans for every word.
- One accent (cyan) reserved for the live channel, the sweep, focus, and selection.
- Alarm semantics (red / amber / green) live only in a lamp or status glyph plus its word.
- Square lamp glyphs encode state by shape: filled, hollow, half-filled, dashed hollow.
- Hairline-rule construction: no cards, no gradients, one shadow.
- Two luminance scenes (day default, night) on identical geometry.
- Motion vocabulary of five moves, all tied to the run.

## Colors

A slate-neutral instrument palette with one cyan accent and three alarm hues that never leave their glyphs.

### Primary
- **Channel Cyan** (`{colors.channel-cyan}` day, `{colors.channel-cyan-night}` night): the active channel header while it is being asked, the erase bar, the Run control, focus outlines, the slider thumb, the caret, selection washes, the primitive tag, and text links. It marks what the instrument is doing right now, never a status.
- **Cyan Wash** (`{colors.cyan-wash}`): the 12% tint under a selected bed row, an asking criterion row, an active icon button, and the 6px halo above the erase bar.

### Secondary (status hues)
- **Met Green** (`{colors.met-green}` day, `{colors.met-green-night}` night): a lamp whose answer favors eligibility, the Eligible readout and status word, the INCL tag.
- **Alarm Red** (`{colors.alarm-red}` day, `{colors.alarm-red-night}` night): a lamp whose answer disfavors eligibility, the Ineligible readout and status word, the EXCL tag, the danger hover on the delete icon button, the error toast.
- **Review Amber** (`{colors.review-amber}` day, `{colors.review-amber-night}` night): an uncertain lamp, the Review readout and status word, the paused telemetry value, the synthetic-data notice mark. Its 16% wash is the notice band's ground.
- **On Status** (`{colors.on-status}`): the check mark drawn over a filled Eligible glyph and the text of an error toast. The only white that stays white in night mode.

### Neutral
- **Daylight Ground / Night Ground** (`{colors.daylight-ground}` / `{colors.night-ground}`): the page and shell background.
- **Panel White / Panel Night** (`{colors.panel-white}` / `{colors.panel-night}`): the numerics strip, the bed grid, the inspector, drawers, inputs, and outlined buttons.
- **Rail Gray / Rail Night** (`{colors.rail-gray}` / `{colors.rail-night}`): the protocol rail, row hover, the Claude summary block.
- **Slate Ink** (`{colors.slate-ink}`): primary text, the Run button while running, the "on" segment, the toast ground.
- **Slate Ink 2** (`{colors.slate-ink-2}`): secondary text, control labels at rest, bed ids, descriptions, the meter fill.
- **Slate Ink 3** (`{colors.slate-ink-3}`): tracked labels, indices, placeholders, hashes, the pending status word.
- **Hairline / Hairline Strong** (`{colors.hairline}` / `{colors.hairline-strong}`): every 1px rule; the strong step for tag borders, the slider track, the switch track at rest, the scrollbar thumb, and the drawer's bottom edge.
- **Lamp Off** (`{colors.lamp-off}`): the dashed pending lamp and pending status glyph.

### Named Rules
**The One Cyan Rule.** Cyan means "live": the channel being asked, the sweep, the Run control, focus, selection. It never encodes a result. If a value could be read as a status, it is green, red, or amber inside a glyph, not cyan.

**The Glyph-Plus-Word Rule.** Red, amber, and green appear only on a lamp, a status glyph with its word, a readout digit, or a kind tag whose letters name the kind. The shape or the word must carry the meaning when the color is removed.

**The Scene Swap Rule.** Night mode is set by `data-theme="dark"` on the root and swaps only color tokens. Geometry, type, rules, and motion are identical in both scenes.

## Typography

**Display / Readout Font:** Martian Mono (with ui-monospace, SF Mono, Menlo, monospace), variable weight 300 to 700, width narrowed to 87.5%
**Body / Label Font:** Barlow Semi Condensed (with Arial Narrow, system-ui, sans-serif), static 400, 500, 600, 700
**Label/Mono Font:** every numeric or code-like value uses the `.data` class: Martian Mono, `font-stretch: 87.5%`, tabular figures

**Character:** A monitor's two voices. The condensed sans reads as printed channel labels and headings: tight, upright, quiet. The narrowed mono is the instrument's own display: every count, id, latency, probability, cost, and timer sits in tabular figures so columns never jitter as values change. Both faces are self-hosted as woff2 subsets with `font-display: swap`.

### Hierarchy
- **Readout** (Martian Mono 500, 1.75rem, line-height 1, tracking -0.01em): the three counts in the numerics strip. Digits cross-fade when they change.
- **Value** (Martian Mono 500, 1rem): the confidence-limit value beside the slider.
- **Data** (Martian Mono 400, 0.75rem body-size inherit; 0.6875rem in channel headers): bed ids, sweep timer, latency, cost, probabilities, hashes, calibration labels (9px SVG text), JSON.
- **Title** (Barlow Semi Condensed 600, 0.875rem, line-height 1.3): brand name, protocol name, inspector id, drawer title.
- **Body** (Barlow Semi Condensed 400, 0.8125rem, line-height 1.35; 1.5 in the note text and drawer notes, max 72ch): the default page text, the describe box, the criterion name at 600.
- **Secondary** (Barlow Semi Condensed 400, 0.75rem, line-height 1.4): criterion questions and descriptions, verdict questions, row counts, eval tables.
- **Control** (Barlow Semi Condensed 600, 0.75rem, tracking 0.02em): every button, segment, switch, and select label.
- **Label** (Barlow Semi Condensed 600, 0.6875rem, tracking 0.08em, uppercase, Slate Ink 3): the tracked label that sits above a readout, a field, or a column, as a monitor prints its channel names.
- **Tag** (Barlow Semi Condensed 700, 0.625rem, tracking 0.08em, line-height 1, uppercase, 1px outline): INCL / EXCL kind tags, primitive tags, the JEV MOCK mode tag.

### Named Rules
**The Mono-for-Values Rule.** Any figure that can change while the user watches is set in Martian Mono with tabular figures. Words are never mono; numbers are never sans.

**The Label-Above Rule.** The 11px uppercase tracked label names the value, field, or column directly beneath it. It is a monitor's channel label, not an editorial eyebrow: it never sits above a heading or a paragraph.

## Layout

The shell is a three-row grid: the numerics strip (64px), the advisory notice (24px minimum, grows to fit), and the panes. The panes split into a 360px protocol rail and a fluid bed grid. The bed grid is itself three rows: a wrapping tools row (40px minimum), a sticky 32px channel header, and a virtualized body of absolutely positioned 28px rows, each a CSS grid whose column template the grid computes from the channel count. The inspector is a 440px fixed panel from the right edge, pinned below the strip and notice; drawers drop from beneath the notice and span from the rail's right edge to the inspector's left edge, capped at `min(70vh, 640px)`.

Rhythm is a 4px module. Observed steps: 4, 6, 8, 10, 12, 16, 20, 24px. Horizontal padding inside strip cells, rail sections, grid rows, and panel heads is 16px (12px in the strip after the header-fit pass, and in rows below 900px). Vertical padding on rail sections and panel heads is 8 to 12px. Controls are 28px tall (26px inside a segmented control, 32px for Run). Numerics strip cells are separated by 1px right rules, not gaps.

Density is high and flat: 28px rows with a 10px lamp centered in each channel cell, no row striping, hover and selection shown by ground color only.

Responsive behavior is deletion first, then reflow. At or below 1320px the third telemetry item hides; at 1180px the second hides too, switch text and icon-button captions drop to icon-only. At 900px the strip wraps to 56px cells with bottom rules, the rail moves below the grid and the grid takes 72vh (minimum 420px), the flip column and row count hide, cell padding falls to 12px, ids drop to 11px, meters narrow to 52px, and both overlays go full-viewport from the top.

## Elevation & Depth

The instrument is flat. Depth is drawn with hairline rules and ground steps (Daylight Ground under Panel White under the rail's Rail Gray), never with shadows or gradients. One surface lifts: the inspector, which slides in over the grid and carries the system's single shadow token. Drawers were pulled back to a flat edge (1px Hairline Strong bottom rule) during finish review so the inspector keeps the lift. Focus is a 2px cyan outline offset 1px; grid rows use an inset 2px cyan left bar instead; the slider thumb uses a two-ring 2px panel / 4px cyan ring.

### Shadow Vocabulary
- **Inspector lift** (`box-shadow: 0 12px 32px -12px rgba(23, 30, 36, 0.28), 0 2px 6px -2px rgba(23, 30, 36, 0.16)` day; `0 16px 40px -12px rgba(0, 0, 0, 0.7), 0 2px 8px -2px rgba(0, 0, 0, 0.5)` night): the inspector panel.

### Named Rules
**The Single Lift Rule.** Only the inspector floats. Every other boundary is a 1px rule, and every other layer is a ground step.

## Shapes

Square with the corners barely eased. Buttons, tags, inputs, the toast, and the mode tag take a 2px radius; segments inside a segmented control are square (0) with the group's 2px outer radius clipping them. The slider thumb is an 8x18px bar with a 1px radius. The only pill is the 26x14px switch track (7px) with a 10px round thumb. Lamps are 10px SVG squares with a 1px corner (0.75px when hollow); status glyphs are 12px squares with a 1.5px corner. The notice mark and the flipped-row marker are unrounded 6px and 4px squares. Scrollbars are 8px with a 4px thumb. Borders are always 1px; the only 2px strokes are focus outlines and the erase bar.

## Components

### Buttons
Monitor controls: short, tracked, mostly outlined, one filled.
- **Shape:** eased square (2px), 28px tall, 10px horizontal padding, 6px icon gap, 12px 600 tracked 0.02em.
- **Run:** Channel Cyan ground, On Cyan text, 32px tall, 13px, 14px right padding; hover brightens 8%. While running it inverts to Panel White ground, Slate Ink text, Hairline Strong border, and its icon becomes a stop square.
- **Primary:** same fill as Run at 28px (Compile with Claude).
- **Icon button:** Panel White ground, 1px Hairline border, Slate Ink 2 text; hover to Slate Ink text and Hairline Strong border; active to Channel Cyan text and border on Cyan Wash; `.danger` hovers to Alarm Red text and border. Captions hide below 1180px.
- **Text button:** no ground or border, Channel Cyan text, 4px padding; hover underlines at 3px offset.
- **Segmented control:** 1px Hairline group outline, 26px segments split by 1px rules; the on segment is Slate Ink on Panel White inverted.
- **Focus:** 2px Channel Cyan outline, 1px offset. State color transitions run 150ms.

### Chips (tags)
- **Style:** 10px 700 uppercase tracked 0.08em, 2px 5px padding, 1px Hairline Strong outline, Slate Ink 2 text, 2px radius, no fill.
- **State:** INCL takes Met Green text and border; EXCL takes Alarm Red; the primitive tag (NOUL, SCORE) takes Channel Cyan; the JEV MOCK mode tag is Slate Ink 2 at 600 and 0.06em, turning cyan when live.

### Cards / Containers
There are no cards. Regions are hairline-ruled panels on ground steps.
- **Numerics strip:** Panel White, 64px, cells separated by 1px right rules, 16px padding (12px after the header-fit pass).
- **Protocol rail:** Rail Gray, 360px, sections split by 1px rules, 12px 16px padding.
- **Bed grid:** Panel White; tools row and channel header ruled beneath; rows ruled beneath.
- **Notice band:** Review Amber wash, 6px amber square mark, 11px 500 tracked 0.02em text, 4px vertical padding, wraps rather than truncates.
- **Inspector:** Panel White, 1px Hairline left rule, single shadow, sticky ruled head, note text at 13px/1.5 max 72ch, verdict list ruled per item.
- **Drawer:** Panel White, 1px Hairline Strong bottom edge, no shadow, ruled head, 16px body padding.
- **Toast:** Slate Ink ground with Panel White text (error: Alarm Red with On Status text), 8px 14px, 2px radius, bottom-centered 24px up.

### Inputs / Fields
- **Describe box:** Panel White, 1px Hairline border, 2px radius, 8px 10px padding, 13px/1.4, vertical resize, 64px minimum; placeholder Slate Ink 3; focus swaps the border to Channel Cyan with no outline.
- **Inline editable (criterion question, name):** transparent with a transparent 1px border and a -4px negative margin so text aligns at rest; hover shows a Hairline border; focus shows Channel Cyan border on Panel White ground and lifts text to Slate Ink. Sizes to content.
- **Weight and key fields:** 24px / 28px tall, Hairline border, Panel White, 12px, cyan border on focus.
- **Select:** 28px, Hairline border, Panel White, inline chevron in Slate Ink 3, 12px.
- **Range (alarm limit):** 120px wide, 2px Hairline Strong track, 8x18px cyan thumb with 1px radius, `ew-resize` cursor; focus draws a 2px panel ring and 4px cyan ring on the thumb.
- **Switch:** 26x14px track (Hairline Strong, cyan when on), 10px panel thumb sliding 12px at 150ms; 2px cyan outline on focus.

### Navigation
The instrument has no page navigation. Filtering is the segmented control (All / Eligible / Ineligible / Review / Flipped) plus a sort select in the grid tools row; overlays are the inspector (row click) and the Eval, Claude, and JSON drawers opened from icon buttons in the strip.

### Lamp (signature)
A 10px SVG square whose shape encodes whether the condition holds and whose color encodes what that means for eligibility:
- **Met:** filled square, 1px corner.
- **Not met:** hollow square, 1.5px stroke, 0.75px corner.
- **Uncertain:** hollow square with its left half filled.
- **Pending:** hollow square, 1px stroke, dashed 1.5/1.5, Lamp Off.
Color: Met Green when the answer favors eligibility (met for an inclusion, not met for an exclusion), Alarm Red when it disfavors, Review Amber when uncertain. A lamp whose criterion has been edited since it was asked is stale and sits at 0.55 opacity until the channel refills. Each arrival blips: color flashes Channel Cyan and the glyph scales from 1.35 back to 1 over 420ms on the ease-out curve.

### Status field (signature)
A 12px glyph plus its word, 12px 600. Eligible is a filled Met Green square with an On Status check; Ineligible a hollow Alarm Red square with an X; Review a hollow Review Amber square with its left half filled; Pending a dashed Slate Ink 3 square with the word at 500. The compact variant (mobile) keeps the glyph and drops the word to a column header of "ST."

### Readout (signature)
A tracked label over a 28px mono count. Each digit lives in a 0.62em slot; when a digit changes, the new one rises from 45% below while the old lifts 45% up and fades, both over 420ms ease-out. Slots are keyed from the right so 99 to 100 grows leftward. Eligible, Ineligible, and Review readouts take their status hue.

### Erase bar (signature)
A 2px Channel Cyan bar with a 6px Cyan Wash halo above it, absolutely positioned in the grid canvas. During a run it tracks progress down the visible rows (`transform: translateY`, 90ms linear) and lamps blip in behind it; at rest it fades out over 600ms after a 300ms hold. The channel header being asked turns cyan while its column refills.

### Motion vocabulary
Exactly five moves, all on `cubic-bezier(0.16, 1, 0.3, 1)`:
1. **Arrival blip**, 420ms: lamp flashes cyan and settles from 1.35 scale.
2. **Digit cross-fade**, 420ms: readout digits rise in / lift out.
3. **Column dim**: stale lamps drop to 0.55 opacity until refilled (color and opacity at 150ms).
4. **Erase-bar sweep**: 90ms linear travel, 600ms fade after a 300ms delay.
5. **Panel entry**, 200ms: inspector slides 24px from the right; drawers and toasts drop 12px.
Control state colors, the disclose chevron's rotation, and the switch thumb transition at 150ms. Under `prefers-reduced-motion` every keyframe animation is removed, the sweep's opacity snaps in 1ms, and all transitions clamp to 80ms; states still change, nothing travels.

## Do's and Don'ts

### Do:
- **Do** set every number that can change in Martian Mono at 87.5% width with tabular figures (`.data`).
- **Do** place the 11px uppercase 0.08em label directly above the value or column it names, in Slate Ink 3.
- **Do** separate regions with 1px Hairline rules and ground steps (Daylight Ground / Panel White / Rail Gray); reserve the shadow token for the inspector.
- **Do** keep Channel Cyan for live state only: the asking channel, the sweep, Run, focus, selection.
- **Do** pair every red, amber, or green with a glyph shape or word that carries the same meaning.
- **Do** keep controls at 28px tall with 2px corners and 12px 600 tracked labels.
- **Do** define night mode by swapping the color tokens under `data-theme="dark"` and nothing else.
- **Do** confine motion to the five moves above at 420 / 420 / 150 / 90+600 / 200ms on the ease-out curve.

### Don't:
- **Don't** introduce cards, gradients, or shadows on any surface but the inspector.
- **Don't** use Channel Cyan to mean eligible, ineligible, or any other result.
- **Don't** convey a status by color alone; the lamp shape or the status word must survive grayscale.
- **Don't** add motion outside the run: no hover lifts, no scroll effects, no ambient animation.
- **Don't** set words in the mono face or figures in the condensed sans.
- **Don't** round corners beyond 2px except the switch pill and the scrollbar thumb.
- **Don't** put the tracked label above a heading or paragraph as an editorial eyebrow.
