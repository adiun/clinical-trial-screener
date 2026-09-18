import { useEffect, useState } from "react";
import type { EvalReport } from "../../../shared/types.js";
import { api } from "../api.js";
import { actions, useStore, type Drawer as DrawerKind } from "../store.js";
import { IconClose, IconSparkle } from "./icons.js";

function DrawerShell({ kind, title, children }: { kind: DrawerKind; title: string; children: React.ReactNode }) {
  const open = useStore((s) => s.drawer === kind);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <section className={`drawer drawer-${kind}`} role="region" aria-label={title}>
      <header className="drawer-head">
        <h2 className="drawer-title">{title}</h2>
        <button className="iconbtn" onClick={actions.closeDrawer} aria-label={`Close ${title}`}>
          <IconClose />
        </button>
      </header>
      <div className="drawer-body">{children}</div>
    </section>
  );
}

// ---- Evaluation ---------------------------------------------------------------

export function EvalDrawer() {
  const open = useStore((s) => s.drawer === "eval");
  const threshold = useStore((s) => s.threshold);
  const lastRunId = useStore((s) => s.lastRun?.runId ?? null);
  const protocol = useStore((s) => s.protocol);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      api
        .evalReport(threshold)
        .then((r) => {
          if (!cancelled) {
            setReport(r);
            setError(null);
          }
        })
        .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, threshold, lastRunId, protocol]);

  return (
    <DrawerShell kind="eval" title="Evaluation against ground truth">
      {error && <p className="drawer-error">{error}</p>}
      {report && !report.available && <p className="drawer-note">{report.reason}</p>}
      {report?.available && (
        <div className="eval">
          <div className="eval-summary data">
            <span>
              Note-level accuracy{" "}
              <strong>{report.noteAccuracy.accuracy === null ? "—" : `${(report.noteAccuracy.accuracy * 100).toFixed(1)}%`}</strong> on {report.noteAccuracy.decided} decided
            </span>
            <span>{report.noteAccuracy.review} sent to review</span>
            <span>limit {threshold.toFixed(2)}</span>
          </div>
          <table className="eval-table">
            <thead>
              <tr>
                <th scope="col">Criterion</th>
                <th scope="col" className="num">Accuracy</th>
                <th scope="col" className="num">Decided</th>
                <th scope="col" className="num">Uncertain</th>
                <th scope="col" className="num">No truth</th>
              </tr>
            </thead>
            <tbody>
              {report.perCriterion.map((r) => (
                <tr key={r.criterionId}>
                  <th scope="row">{r.name}</th>
                  <td className="num data">
                    {r.accuracy === null ? "—" : `${(r.accuracy * 100).toFixed(0)}%`}
                    <span className="acc-bar" aria-hidden="true">
                      <span style={{ transform: `scaleX(${r.accuracy ?? 0})` }} />
                    </span>
                  </td>
                  <td className="num data">{r.decided}</td>
                  <td className="num data">{r.uncertain}</td>
                  <td className="num data">{r.noTruth}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Calibration buckets={report.calibration} />
        </div>
      )}
    </DrawerShell>
  );
}

/** Stated confidence (bucketed) against observed accuracy of the argmax answer. */
function Calibration({ buckets }: { buckets: EvalReport["calibration"] }) {
  const W = 320;
  const H = 200;
  const pad = { l: 40, r: 12, t: 12, b: 32 };
  const x = (v: number) => pad.l + ((v - 0.5) / 0.5) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const points = buckets.filter((b) => b.n > 0 && b.accuracy !== null && b.meanConfidence !== null);
  const maxN = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <figure className="calibration">
      <figcaption className="label">Calibration · stated confidence vs observed accuracy</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Calibration plot. Each point is a confidence bucket; the diagonal is perfect calibration.">
        <line x1={x(0.5)} y1={y(0.5)} x2={x(1)} y2={y(1)} className="cal-diag" />
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={y(0.5)} x2={x(v)} y2={y(0.5) + 4} className="cal-tick" />
            <text x={x(v)} y={H - pad.b + 16} className="cal-label" textAnchor="middle">
              {v.toFixed(1)}
            </text>
            <line x1={pad.l - 4} y1={y(v)} x2={pad.l} y2={y(v)} className="cal-tick" />
            <text x={pad.l - 8} y={y(v) + 3} className="cal-label" textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={pad.l} y1={y(0.5)} x2={W - pad.r} y2={y(0.5)} className="cal-axis" />
        <line x1={pad.l} y1={y(0.5)} x2={pad.l} y2={pad.t} className="cal-axis" />
        {points.length > 1 && (
          <polyline className="cal-line" points={points.map((b) => `${x(b.meanConfidence!)},${y(b.accuracy!)}`).join(" ")} />
        )}
        {points.map((b) => (
          <g key={b.lo}>
            <circle cx={x(b.meanConfidence!)} cy={y(b.accuracy!)} r={3 + 6 * Math.sqrt(b.n / maxN)} className="cal-point" />
            <title>{`confidence ${b.lo.toFixed(1)}–${b.hi.toFixed(1)}: accuracy ${(b.accuracy! * 100).toFixed(0)}% over ${b.n} answers`}</title>
          </g>
        ))}
        <text x={(pad.l + W - pad.r) / 2} y={H - 4} className="cal-label" textAnchor="middle">
          stated confidence
        </text>
      </svg>
      <table className="visually-hidden">
        <caption>Calibration buckets</caption>
        <thead>
          <tr>
            <th>Bucket</th>
            <th>Answers</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.lo}>
              <td>
                {b.lo.toFixed(1)}–{b.hi.toFixed(1)}
              </td>
              <td>{b.n}</td>
              <td>{b.accuracy === null ? "—" : `${(b.accuracy * 100).toFixed(0)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// ---- Claude credentials ----------------------------------------------------

export function ClaudeDrawer() {
  const claude = useStore((s) => s.claude);
  const lastRun = useStore((s) => s.lastRun);
  const summary = useStore((s) => s.summary);
  const summaryPending = useStore((s) => s.summaryPending);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.claudeCredentials(key || undefined, undefined);
      actions.setClaude({ configured: r.configured, model: r.model, models: claude?.models ?? [] });
      setKey("");
      actions.toast("Claude credentials held in server memory for this process.");
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const setModel = async (m: string) => {
    try {
      const r = await api.claudeCredentials(undefined, m);
      actions.setClaude({ configured: r.configured, model: r.model, models: claude?.models ?? [] });
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const forget = async () => {
    await api.claudeForget();
    actions.setClaude({ configured: false, model: claude?.model ?? "claude-sonnet-5", models: claude?.models ?? [] });
  };

  const summarize = async () => {
    if (!lastRun) return;
    actions.setSummaryPending(true);
    try {
      await api.summary(lastRun.runId);
    } catch (err) {
      actions.setSummaryPending(false);
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  return (
    <DrawerShell kind="claude" title="Claude credentials">
      <div className="claude">
        <p className="drawer-note">
          The key is sent to the local backend and held in memory for the life of the process. It is never written to disk or logs, and never used to read note text: Claude compiles your plain-English description into criteria and summarizes runs from aggregate counts only.
        </p>
        <div className="field">
          <label className="label" htmlFor="anthropic-key">
            Anthropic API key
          </label>
          <div className="key-row">
            <input id="anthropic-key" className="data" type="password" autoComplete="off" spellCheck={false} placeholder={claude?.configured ? "•••••••• (configured)" : "sk-ant-…"} value={key} onChange={(e) => setKey(e.target.value)} />
            <button className="primary" onClick={save} disabled={busy || !key.trim()}>
              {claude?.configured ? "Replace" : "Save"}
            </button>
            {claude?.configured && (
              <button className="textbtn" onClick={forget}>
                Forget
              </button>
            )}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="claude-model">
            Model
          </label>
          <select id="claude-model" className="data" value={claude?.model ?? "claude-sonnet-5"} onChange={(e) => void setModel(e.target.value)}>
            {(claude?.models ?? ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"]).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">Run summary</span>
          <div className="summary-row">
            <button className="iconbtn" onClick={summarize} disabled={!claude?.configured || !lastRun || summaryPending}>
              <IconSparkle />
              <span>{summaryPending ? "Writing…" : "Summarize last run"}</span>
            </button>
            {!claude?.configured && <span className="muted">Add a key to enable.</span>}
          </div>
          {summary && <p className="summary-text">{summary.text}</p>}
        </div>
      </div>
    </DrawerShell>
  );
}

// ---- Compiled JSON -----------------------------------------------------------

export function JsonDrawer() {
  const protocol = useStore((s) => s.protocol);
  if (!protocol) return null;
  const text =
    protocol.compiledJson ??
    JSON.stringify(
      {
        name: protocol.name,
        description: protocol.description,
        criteria: protocol.criteria.map(({ id, position, hash, ...rest }) => rest),
      },
      null,
      2,
    );
  return (
    <DrawerShell kind="json" title={protocol.compiledJson ? "Compiled criteria (from Claude)" : "Current criteria as JSON"}>
      <pre className="json data">{text}</pre>
    </DrawerShell>
  );
}
