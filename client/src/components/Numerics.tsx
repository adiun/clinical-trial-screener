import { useEffect, useState } from "react";
import { api } from "../api.js";
import { actions, snapshotsFor, useStore } from "../store.js";
import { Count } from "./Count.js";
import { IconChart, IconKey, IconMoon, IconPlay, IconReset, IconStop, IconSun } from "./icons.js";

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return `${Math.round(ms)}`;
}

function fmtSeconds(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtUsd(n: number): string {
  if (n === 0) return "$0.0000";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

/** Live elapsed time while a run is in progress. */
function useElapsed(): number | null {
  const run = useStore((s) => s.run);
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    if (run.phase !== "running") return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run.phase]);
  if (run.phase === "running" && run.startedAt !== null) return now - run.startedAt;
  return run.elapsedMs;
}

export function Numerics() {
  const counts = useStore((s) => snapshotsFor(s).counts);
  const threshold = useStore((s) => s.threshold);
  const run = useStore((s) => s.run);
  const lastRun = useStore((s) => s.lastRun);
  const mode = useStore((s) => s.mode);
  const jevModel = useStore((s) => s.jevModel);
  const theme = useStore((s) => s.theme);
  const autoRun = useStore((s) => s.autoRun);
  const retries = useStore((s) => s.retries);
  const failedCount = useStore((s) => Object.keys(s.failures).length);

  const setRetries = async (on: boolean) => {
    actions.setRetries(on);
    try {
      const r = await api.settings({ retries: on });
      actions.setRetries(r.retries);
    } catch (err) {
      actions.setRetries(!on);
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };
  const drawer = useStore((s) => s.drawer);
  const notesLoaded = useStore((s) => s.notesLoaded);
  const noteCount = useStore((s) => s.notes.length);
  const elapsed = useElapsed();
  const running = run.phase === "running";
  const paused = running && run.pauseUntil !== null && run.pauseUntil > performance.now();

  const onRun = async () => {
    try {
      if (running) {
        await api.cancel();
        actions.markCancelled();
      } else {
        await api.run(threshold, "run");
      }
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const [resetting, setResetting] = useState(false);
  const onReset = async () => {
    setResetting(true);
    try {
      const app = await api.resetAll();
      actions.resetAll(app);
      actions.toast("Reset: answer cache and run history cleared, default protocol restored. The next run is cold.");
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setResetting(false);
    }
  };

  const total = running || run.phase === "done" ? run.total || noteCount : noteCount;
  const done = running ? run.done : run.phase === "done" ? total : 0;

  return (
    <header className="numerics" aria-label="Screening status">
      <div className="brand">
        <span className="brand-name">Eligibility Screener</span>
        <span className={`mode-tag data mode-${mode}`} title={mode === "mock" ? "Fake Jev client with jitter; no quota used" : `Live TypeSafe ${jevModel}`}>
          {mode === "mock" ? "JEV MOCK" : jevModel.toUpperCase()}
        </span>
      </div>

      <div className="readouts">
        <div className="readout readout-ok">
          <span className="label">Eligible</span>
          <Count value={counts.eligible} min={3} className="readout-value" />
        </div>
        <div className="readout readout-bad">
          <span className="label">Ineligible</span>
          <Count value={counts.ineligible} min={3} className="readout-value" />
        </div>
        <div className="readout readout-warn">
          <span className="label">Review</span>
          <Count value={counts.review} min={3} className="readout-value" />
        </div>
      </div>

      <div className="limit">
        <label className="label" htmlFor="limit">
          Confidence limit
        </label>
        <div className="limit-row">
          <input
            id="limit"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={threshold}
            onChange={(e) => actions.setThreshold(Number(e.target.value))}
            aria-valuetext={`${threshold.toFixed(2)} confidence`}
          />
          <output htmlFor="limit" className="data limit-value">
            {threshold.toFixed(2)}
          </output>
        </div>
      </div>

      <div className="telemetry data" aria-live="off">
        <div className="tele">
          <span className="label">Sweep</span>
          <span className="tele-value">
            {done}/{total} · {fmtSeconds(elapsed)}
            {paused && <span className="tele-pause"> · paused {Math.round((run.pauseMs ?? 0) / 100) / 10}s (429)</span>}
            {failedCount > 0 && <span className="tele-fail"> · {failedCount} failed</span>}
          </span>
        </div>
        <div className="tele">
          <span className="label">Latency ms</span>
          <span className="tele-value">
            {lastRun && lastRun.apiCalls === 0 ? "all from cache" : `p50 ${fmtMs(lastRun?.p50 ?? null)} · p99 ${fmtMs(lastRun?.p99 ?? null)}`}
          </span>
        </div>
        <div className="tele">
          <span className="label">Est. cost</span>
          <span className="tele-value">{fmtUsd(lastRun?.estimatedCostUsd ?? 0)}</span>
        </div>
      </div>

      <div className="controls">
        <label className="switch">
          <input type="checkbox" checked={autoRun} onChange={(e) => actions.setAutoRun(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text" title="Re-run the edited criterion automatically after each committed edit">Auto-run</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={retries} onChange={(e) => void setRetries(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text" title="Retry failed Jev requests with backoff. Off: one attempt per note, failures are shown in the list, and no time is spent waiting on retries.">Retries</span>
        </label>
        <button className={`iconbtn${drawer === "eval" ? " active" : ""}`} onClick={() => actions.setDrawer("eval")} aria-pressed={drawer === "eval"} title="Evaluation against ground truth">
          <IconChart />
          <span>Eval</span>
        </button>
        <button className={`iconbtn${drawer === "claude" ? " active" : ""}`} onClick={() => actions.setDrawer("claude")} aria-pressed={drawer === "claude"} title="Claude credentials">
          <IconKey />
          <span>Claude</span>
        </button>
        <button className="iconbtn danger" onClick={onReset} disabled={resetting} title="Reset to a cold start: clear the answer cache and run history, restore the default protocol. Notes and Claude key are kept." aria-label="Reset cache, runs, and protocol">
          <IconReset />
          <span>{resetting ? "Resetting…" : "Reset"}</span>
        </button>
        <button className="iconbtn" onClick={() => actions.setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Switch to day mode" : "Switch to night mode"} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}>
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
        <button className={`runbtn${running ? " running" : ""}`} onClick={onRun} disabled={!notesLoaded} title={notesLoaded ? undefined : "Load notes first"}>
          {running ? <IconStop /> : <IconPlay />}
          <span>{running ? "Stop" : "Run"}</span>
        </button>
      </div>
    </header>
  );
}
