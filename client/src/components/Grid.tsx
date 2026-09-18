import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteStatus, NoteView } from "../../../shared/types.js";
import { eligibilityScore } from "../../../shared/rollup.js";
import { actions, flipsFor, snapshotsFor, useStore, type Filter, type SortKey } from "../store.js";
import { Lamp, StatusField } from "./Lamp.js";

const ROW_H = 28;
const OVERSCAN = 8;
const BLIP_MS = 420;
const STATUS_ORDER: Record<NoteStatus, number> = { ineligible: 0, review: 1, eligible: 2, pending: 3 };

/** True below the stacking breakpoint; the grid tightens its tracks there. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export function Grid() {
  const notes = useStore((s) => s.notes);
  const protocol = useStore((s) => s.protocol);
  const answers = useStore((s) => s.answers);
  const arrivals = useStore((s) => s.arrivals);
  const { snapshots } = useStore((s) => snapshotsFor(s));
  const flips = useStore((s) => flipsFor(s));
  const filter = useStore((s) => s.filter);
  const sort = useStore((s) => s.sort);
  const selected = useStore((s) => s.selectedNoteId);
  const run = useStore((s) => s.run);
  const notesLoaded = useStore((s) => s.notesLoaded);
  const criteria = protocol?.criteria ?? [];
  const narrow = useNarrow();

  const rows = useMemo(() => {
    let list: NoteView[] = notes;
    if (filter === "flipped") list = notes.filter((n) => flips.has(n.id));
    else if (filter !== "all") list = notes.filter((n) => snapshots[n.id]?.status === filter);
    if (sort === "status") list = [...list].sort((a, b) => STATUS_ORDER[snapshots[a.id]?.status ?? "pending"] - STATUS_ORDER[snapshots[b.id]?.status ?? "pending"] || a.position - b.position);
    else if (sort === "score") list = [...list].sort((a, b) => eligibilityScore(criteria, answers[b.id]) - eligibilityScore(criteria, answers[a.id]) || a.position - b.position);
    else if (sort === "id") list = [...list].sort((a, b) => a.id.localeCompare(b.id));
    return list;
  }, [notes, filter, sort, snapshots, flips, criteria, answers]);

  // ---- virtualization ------------------------------------------------------
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const onScroll = useCallback(() => {
    if (scroller.current) setScrollTop(scroller.current.scrollTop);
  }, []);
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_H) + OVERSCAN);
  const visible = rows.slice(start, end);

  // Re-render once the last blip has decayed so the animation classes drop.
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => force((n) => n + 1), BLIP_MS + 40);
    return () => window.clearTimeout(t);
  }, [arrivals]);
  const now = performance.now();

  // The erase bar: one cyan wavefront that crosses the visible rows exactly
  // once per run, from the top of the viewport to the bottom, as the sweep
  // progresses. Results land behind it (and, because arrival order is not
  // table order, occasionally ahead of it); the bar is the run's clock, the
  // blips are the returns.
  const progress = run.phase === "running" && run.total > 0 ? run.done / run.total : run.phase === "done" ? 1 : 0;
  const sweepY = scrollTop + Math.min(height - 2, progress * height);
  const flippedCount = flips.size;

  const lampTrack = narrow ? 24 : 36;
  const gridTemplate = narrow
    ? `72px 28px repeat(${criteria.length}, ${lampTrack}px) 0px`
    : `92px 116px repeat(${criteria.length}, ${lampTrack}px) minmax(0, 1fr)`;

  return (
    <section className="grid" aria-label="Notes">
      <div className="grid-tools">
        <div className="seg" role="group" aria-label="Filter">
          {(["all", "eligible", "ineligible", "review", "flipped"] as Filter[]).map((f) => (
            <button key={f} className={`seg-btn${filter === f ? " on" : ""}`} onClick={() => actions.setFilter(f)} aria-pressed={filter === f}>
              {f === "all" ? "All" : f === "flipped" ? `Flipped${flippedCount ? ` · ${flippedCount}` : ""}` : f[0]!.toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <label className="sort">
          <span className="label">Sort</span>
          <select value={sort} onChange={(e) => actions.setSort(e.target.value as SortKey)} aria-label="Sort rows">
            <option value="arrival">Table order</option>
            <option value="status">Status</option>
            <option value="score">Eligibility score</option>
            <option value="id">Note id</option>
          </select>
        </label>
        <span className="row-count data">
          {rows.length} of {notes.length}
        </span>
      </div>

      <div className="grid-head" style={{ gridTemplateColumns: gridTemplate }} role="row">
        <span className="label" role="columnheader">
          Note
        </span>
        <span className="label" role="columnheader">
          {narrow ? "St." : "Status"}
        </span>
        {criteria.map((c, i) => {
          const asking = run.phase === "running" && run.askingCriterionIds.includes(c.id);
          return (
            <span key={c.id} className={`label col-crit data${asking ? " asking" : ""}`} role="columnheader" title={`${c.name} (${c.kind})`} aria-label={c.name}>
              {String(i + 1).padStart(2, "0")}
            </span>
          );
        })}
        <span className="label col-flip" role="columnheader">
          {narrow ? "" : "Flip"}
        </span>
      </div>

      <div className="grid-body" ref={scroller} onScroll={onScroll} role="grid" aria-rowcount={rows.length}>
        {!notesLoaded && (
          <div className="grid-empty">
            <p>No notes loaded.</p>
            <p className="data">
              Put your file at <code>data/notes.jsonl</code> and run <code>npm run import</code>, then reload.
            </p>
          </div>
        )}
        {notesLoaded && rows.length === 0 && (
          <div className="grid-empty">
            <p>No notes match this filter.</p>
          </div>
        )}
        <div className="grid-canvas" style={{ height: rows.length * ROW_H }}>
          <span className={`sweep${run.phase === "running" ? " live" : ""}`} style={{ transform: `translateY(${sweepY}px)` }} aria-hidden="true" />
          {visible.map((note, i) => {
            const index = start + i;
            const snap = snapshots[note.id];
            const status = snap?.status ?? "pending";
            const flip = flips.get(note.id);
            const arrived = arrivals[note.id];
            const fresh = arrived !== undefined && now - arrived < BLIP_MS;
            const noteAnswers = answers[note.id];
            return (
              <div
                key={note.id}
                role="row"
                aria-rowindex={index + 1}
                aria-selected={selected === note.id}
                tabIndex={0}
                className={`row row-${status}${selected === note.id ? " selected" : ""}${flip ? " flipped" : ""}`}
                style={{ transform: `translateY(${index * ROW_H}px)`, gridTemplateColumns: gridTemplate }}
                onClick={() => actions.select(note.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    actions.select(note.id);
                  }
                }}
              >
                <span className="cell cell-id data" role="gridcell">
                  {note.id}
                </span>
                <span className="cell cell-status" role="gridcell">
                  <StatusField status={status} compact={narrow} />
                </span>
                {criteria.map((c) => {
                  const a = noteAnswers?.[c.id];
                  const stale = !a || a.criterionHash !== c.hash;
                  const cs = snap?.criteria[c.id] ?? "pending";
                  return (
                    <span key={c.id} className={`cell cell-lamp${stale ? " stale" : ""}`} role="gridcell">
                      <Lamp
                        key={fresh && !stale ? arrived : "settled"}
                        status={cs}
                        kind={c.kind}
                        blip={fresh && !stale}
                        title={`${c.name}: ${cs.replace("_", " ")}${a && !stale ? ` (p ${a.p.toFixed(2)}, c ${a.c.toFixed(2)})` : ""}`}
                      />
                    </span>
                  );
                })}
                <span className="cell cell-flip" role="gridcell">
                  {flip && !narrow && (
                    <span className="flip-note">
                      <span className="data">
                        {flip.from[0]!.toUpperCase()}→{flip.to[0]!.toUpperCase()}
                      </span>
                      {flip.criterionId && <span className="flip-crit">{criteria.find((c) => c.id === flip.criterionId)?.name ?? ""}</span>}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
