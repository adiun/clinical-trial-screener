# Technical audit — Eligibility Screener UI

Scope: `client/` (React 19 + Vite), measured against the shipped build on 2026-09-18.
Method: code inspection, the Impeccable detector (`impeccable detect --json client/src client/index.html` → no findings), computed WCAG contrast ratios for every token pair in both themes, and headless-Chrome captures at 1440×900 and 390×844 in day and night modes. Touch gestures were not synthesized; the 390px layout was verified as a rendered viewport only.

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Interactive controls are 26–28px tall; below the 44px touch guideline on phones |
| 2 | Performance | 4 | Virtualized rows, frame-batched SSE, `contain: layout style`; no layout thrash |
| 3 | Responsive design | 3 | Stacks cleanly below 900px; density is desktop-first by brief, so touch targets stay small |
| 4 | Theming | 4 | Every color is a token; both themes clear 4.5:1 for small text after the polish pass |
| 5 | Implementation integrity | 4 | One vocabulary of controls, glyphs, and motion; detector clean; no decorative chrome |
| **Total** | | **18/20** | **Excellent (minor polish)** |

## Implementation integrity verdict

**Pass.** The surface expresses one product-specific system: square lamp glyphs whose shape carries state, a single cyan accent reserved for the active channel and the sweep, hairline rules with no cards or gradients, Barlow Semi Condensed labels over Martian Mono tabular values, and a motion vocabulary limited to the arrival blip, digit cross-fade, column dim/refill, and the erase-bar sweep. The detector returned no findings. Nothing in the markup is interchangeable with a generic admin template.

## Executive summary

- Audit Health Score: **18/20** (Excellent)
- Issues: P0 0 · P1 0 · P2 2 open (1 fixed) · P3 2 open (1 fixed)
- Top items: small touch targets on phones; arrow-key navigation in the grid. The reduced-motion rule and the toast token were fixed during the polish pass.
- Next steps: `/impeccable adapt` for touch targets if phone use is ever a real scenario; otherwise the P3 items fold into routine polish.

## Findings

### P2

**[P2] Touch targets below 44px**
Location: `client/src/styles/app.css` — `.iconbtn`, `.textbtn`, `.seg-btn` (26–28px tall), range thumb 8×18px, `.disclose`.
Category: Responsive / Accessibility. WCAG 2.5.8 (AA, 24px minimum) is met; the 44px platform guideline is not.
Impact: fiddly on a phone; the brief pins desktop density, so this is a scenario question, not a defect on the primary device.
Recommendation: at `max-width: 900px`, raise control height to 40px and widen the slider thumb. Suggested command: `/impeccable adapt`.

**[P2 → fixed in the polish pass] Reduced motion was a global kill**
Location: `client/src/styles/base.css` `@media (prefers-reduced-motion: reduce)`.
Category: Accessibility. WCAG 2.3.3 (AAA) intent.
Was: every animation and transition collapsed to 1ms. Now: the transform-driven pieces (blip scale, digit slide, inspector/drawer/toast entry, the sweep) are disabled and color/opacity transitions run at 80ms, so state changes remain visible without travel.

**[P2] Grid rows are focusable but arrow-key navigation is absent**
Location: `client/src/components/Grid.tsx` (rows carry `tabIndex={0}`, Enter/Space select).
Category: Accessibility. WCAG 2.1.1 is met via Tab; a `role="grid"` conventionally also supports arrow keys.
Impact: keyboard users Tab through visible rows one at a time; workable, not fast.
Recommendation: add ArrowUp/ArrowDown handling that moves focus and scrolls the virtual window. Suggested command: `/impeccable harden`.

### P3

**[P3 → fixed in the polish pass] Hard-coded white on the error toast**
Location: `client/src/styles/app.css` `.toast-error`.
Category: Theming. Now uses the new `--on-status` token, which the eligible glyph's check mark also uses.

**[P3] Row hover surface lowers status-text contrast slightly**
Location: `.row:hover { background: var(--surface-2) }` with `--ok`/`--warn` text.
Category: Theming. Light `--ok` on `--surface-2` is 4.99:1 and `--warn` 5.46:1 after polish; before polish `--ok` was 4.24:1. Now compliant; noted so the values are not loosened later.

**[P3] Range input relies on the browser's native tooltip for its value**
Location: `Numerics.tsx` `<input type="range">` with an `<output>` beside it.
Category: Accessibility. `aria-valuetext` is set and the `<output>` is bound via `htmlFor`; screen readers announce the value. Fine as is; listed because the visible `<output>` is not programmatically in the control's label chain for all browsers.

## Patterns and systemic notes

- Control heights are uniform at 28px across the header, rail, grid tools, and drawers. That consistency is a strength on desktop and the single reason the touch-target finding recurs everywhere; one media-query rule fixes all instances.
- Color is fully tokenized (`tokens.css`); the one exception above is the toast.
- Motion is centralized in `app.css` keyframes (`blip`, `digit-in`, `digit-out`, `slide-in`, `drop-in`) and honors the brief's "functional only" rule.

## Positive findings

- 500 rows render as ~40 DOM rows; SSE events at several hundred per second coalesce to one React update per frame (`store.ts` `flush`).
- Every status is readable without color: filled / hollow / half / dashed lamp shapes, glyph plus word in the status field.
- Browser surfaces are themed from the palette: selection, caret, focus ring, scrollbars, range thumb, select chevron, tabular numerals.
- Faces are self-hosted (`client/public/fonts`, OFL); no CDN dependency, no system-face fallback in normal operation.
- Semantic landmarks (`header`, `main`, `aside`, `section`), labeled form controls, `role="grid"` with row/cell roles and `aria-rowcount`, `aria-pressed` on toggles, `role="status"` on the toast.
- Both themes clear 4.5:1 for all small text tokens on all three surfaces (measured: light `--ink-3` 4.95 on bg, 5.47 on surface; dark 5.45 / 5.09).

## Recommended actions

1. **[P2] `/impeccable adapt`**: raise control heights and the slider thumb to 40–44px below 900px.
2. **[P2] `/impeccable harden`**: arrow-key row navigation in the virtualized grid.
3. **[P3] `/impeccable polish`**: final pass after the above.
