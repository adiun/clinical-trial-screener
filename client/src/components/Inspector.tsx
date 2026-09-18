import { useEffect } from "react";
import { criterionStatus } from "../../../shared/rollup.js";
import { actions, snapshotsFor, useStore } from "../store.js";
import { IconClose } from "./icons.js";
import { Lamp, StatusField } from "./Lamp.js";

export function Inspector() {
  const selectedId = useStore((s) => s.selectedNoteId);
  const note = useStore((s) => s.notes.find((n) => n.id === s.selectedNoteId) ?? null);
  const protocol = useStore((s) => s.protocol);
  const answers = useStore((s) => (s.selectedNoteId ? s.answers[s.selectedNoteId] : undefined));
  const threshold = useStore((s) => s.threshold);
  const snap = useStore((s) => (s.selectedNoteId ? snapshotsFor(s).snapshots[s.selectedNoteId] : undefined));
  const failure = useStore((s) => (s.selectedNoteId ? s.failures[s.selectedNoteId] : undefined));

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  if (!note || !protocol) return null;

  return (
    <aside className="inspector" aria-label={`Note ${note.id}`}>
      <header className="inspector-head">
        <div>
          <span className="data inspector-id">{note.id}</span>
          <span className="inspector-meta data">
            {note.format}
            {note.age !== null ? ` · ${note.age}y` : ""}
            {note.sex ? ` · ${note.sex}` : ""}
          </span>
        </div>
        <StatusField status={failure && (snap?.status ?? "pending") === "pending" ? "failed" : (snap?.status ?? "pending")} />
        <button className="iconbtn" onClick={() => actions.select(null)} aria-label="Close note">
          <IconClose />
        </button>
      </header>

      {failure && (
        <p className="inspector-fail" role="status">
          The Jev request for this note failed and was not retried: <span className="data">{failure}</span>. Run again to re-ask it; unchanged criteria still come from cache.
        </p>
      )}

      <pre className="note-text">{note.text}</pre>

      <ol className="verdicts" aria-label="Per-criterion answers">
        {protocol.criteria.map((c) => {
          const a = answers?.[c.id];
          const live = a && a.criterionHash === c.hash ? a : undefined;
          const status = criterionStatus(live, threshold);
          return (
            <li key={c.id} className="verdict">
              <div className="verdict-head">
                <Lamp status={status} kind={c.kind} />
                <span className="verdict-name">{c.name}</span>
                <span className={`kind-tag kind-${c.kind} static`}>{c.kind === "inclusion" ? "INCL" : "EXCL"}</span>
                <span className="verdict-status data">{status.replace("_", " ")}</span>
              </div>
              <p className="verdict-q">{c.question}</p>
              {live ? (
                <div className="verdict-meters data">
                  <Meter label="p(met)" value={live.p} />
                  <Meter label="confidence" value={live.c} mark={threshold} />
                  <span className="verdict-latency">{live.cached ? "cache" : `${Math.round(live.latencyMs)} ms`}</span>
                </div>
              ) : (
                <div className="verdict-meters data muted">not yet asked</div>
              )}
              {live && live.raw.type === "score" && c.levels && (
                <ol className="levels-dist" aria-label="Level probabilities">
                  {c.levels.map((l, i) => {
                    const p = live.raw.type === "score" ? live.raw.probabilities[String(i)] ?? 0 : 0;
                    const met = c.metLevels?.includes(i);
                    return (
                      <li key={i} className={met ? "met" : ""}>
                        <span className="data lvl-p">{(p * 100).toFixed(0)}%</span>
                        <span className="lvl-bar" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />
                        <span className="lvl-text">{l}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function Meter({ label, value, mark }: { label: string; value: number; mark?: number }) {
  return (
    <span className="meter" title={`${label} ${value.toFixed(3)}`}>
      <span className="meter-label">{label}</span>
      <span className="meter-track" aria-hidden="true">
        <span className="meter-fill" style={{ transform: `scaleX(${value})` }} />
        {mark !== undefined && <span className="meter-mark" style={{ left: `${mark * 100}%` }} />}
      </span>
      <span className="meter-value">{value.toFixed(2)}</span>
    </span>
  );
}
