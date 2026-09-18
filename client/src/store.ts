// A small external store. SSE events arrive at up to several hundred per
// second during a run; they are coalesced into one state update per animation
// frame so React renders at most once per frame.
import { useSyncExternalStore } from "react";
import type { Answer, AppState, ClaudeStatus, NoteStatusSnapshot, NoteView, Protocol, RunStats, SseEvent } from "../../shared/types.js";
import { countStatuses, flippedNotes, noteStatus, type Counts, type Flip } from "../../shared/rollup.js";

export type Filter = "all" | "eligible" | "ineligible" | "review" | "flipped" | "failed";
export type SortKey = "arrival" | "status" | "score" | "id";
export type Drawer = "eval" | "claude" | "json" | null;
export type Theme = "light" | "dark";

export interface RunView {
  id: string | null;
  phase: "idle" | "running" | "done" | "cancelled";
  total: number;
  done: number;
  toAsk: number;
  fromCache: number;
  startedAt: number | null;
  elapsedMs: number | null;
  trigger: "run" | "edit" | "replay";
  askingCriterionIds: string[];
  pauseMs: number | null;
  pauseUntil: number | null;
}

export interface State {
  loaded: boolean;
  loadError: string | null;
  notesLoaded: boolean;
  mode: "mock" | "live";
  jevModel: string;
  concurrency: number;
  protocol: Protocol | null;
  notes: NoteView[];
  answers: Record<string, Record<string, Answer>>;
  /** noteId -> timestamp of the most recent arrival, drives the blip. */
  arrivals: Record<string, number>;
  threshold: number;
  run: RunView;
  lastRun: RunStats | null;
  /** Statuses before the most recent run started. Flips are measured against this. */
  baseline: Record<string, NoteStatusSnapshot> | null;
  selectedNoteId: string | null;
  filter: Filter;
  sort: SortKey;
  drawer: Drawer;
  theme: Theme;
  autoRun: boolean;
  /** Server-side setting: retry failed Jev requests. */
  retries: boolean;
  /** noteId -> reason, for notes whose request failed in the current or last run. */
  failures: Record<string, string>;
  claude: ClaudeStatus | null;
  summary: { runId: string; text: string } | null;
  summaryPending: boolean;
  toast: { id: number; text: string; kind: "info" | "error" } | null;
}

const initialRun: RunView = {
  id: null,
  phase: "idle",
  total: 0,
  done: 0,
  toAsk: 0,
  fromCache: 0,
  startedAt: null,
  elapsedMs: null,
  trigger: "run",
  askingCriterionIds: [],
  pauseMs: null,
  pauseUntil: null,
};

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

let state: State = {
  loaded: false,
  loadError: null,
  notesLoaded: false,
  mode: "mock",
  jevModel: "",
  concurrency: 50,
  protocol: null,
  notes: [],
  answers: {},
  arrivals: {},
  threshold: readStored("screener.threshold", 0.6),
  run: initialRun,
  lastRun: null,
  baseline: null,
  selectedNoteId: null,
  filter: "all",
  sort: "arrival",
  drawer: null,
  theme: readTheme(),
  autoRun: readStored("screener.autoRun", true),
  retries: true,
  failures: {},
  claude: null,
  summary: null,
  summaryPending: false,
  toast: null,
};

const listeners = new Set<() => void>();
let frame: number | null = null;
let pendingNotes: { noteId: string; answers: Record<string, Answer>; error: string | undefined }[] = [];
let pendingOther: SseEvent[] = [];

function emit(): void {
  for (const l of listeners) l();
}

function set(patch: Partial<State> | ((s: State) => Partial<State>)): void {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function getState(): State {
  return state;
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

// ---- derived -----------------------------------------------------------------

let derivedKey: { answers: State["answers"]; protocol: Protocol | null; threshold: number } | null = null;
let derivedValue: { snapshots: Record<string, NoteStatusSnapshot>; counts: Counts } | null = null;

export function snapshotsFor(s: State): { snapshots: Record<string, NoteStatusSnapshot>; counts: Counts } {
  if (derivedKey && derivedValue && derivedKey.answers === s.answers && derivedKey.protocol === s.protocol && derivedKey.threshold === s.threshold) {
    return derivedValue;
  }
  const snapshots: Record<string, NoteStatusSnapshot> = {};
  const criteria = s.protocol?.criteria ?? [];
  for (const n of s.notes) snapshots[n.id] = noteStatus(criteria, s.answers[n.id], s.threshold);
  const counts = countStatuses(Object.values(snapshots));
  derivedKey = { answers: s.answers, protocol: s.protocol, threshold: s.threshold };
  derivedValue = { snapshots, counts };
  return derivedValue;
}

let flipKey: { baseline: State["baseline"]; snapshots: Record<string, NoteStatusSnapshot>; protocol: Protocol | null } | null = null;
let flipValue: Map<string, Flip> | null = null;

export function flipsFor(s: State): Map<string, Flip> {
  const { snapshots } = snapshotsFor(s);
  if (flipKey && flipValue && flipKey.baseline === s.baseline && flipKey.snapshots === snapshots && flipKey.protocol === s.protocol) return flipValue;
  const map = new Map<string, Flip>();
  if (s.baseline && s.protocol) for (const f of flippedNotes(s.protocol.criteria, s.baseline, snapshots)) map.set(f.noteId, f);
  flipKey = { baseline: s.baseline, snapshots, protocol: s.protocol };
  flipValue = map;
  return map;
}

// ---- bootstrap --------------------------------------------------------------

export function hydrate(app: AppState): void {
  set({
    loaded: true,
    loadError: null,
    notesLoaded: app.notesLoaded,
    mode: app.mode,
    jevModel: app.jevModel,
    concurrency: app.concurrency,
    protocol: app.protocol,
    notes: app.notes,
    answers: app.answers,
    lastRun: app.lastRun,
    retries: app.retries,
    failures: app.lastRun?.failures ?? {},
    baseline: app.previousSnapshot ?? null,
    run: app.lastRun
      ? { ...initialRun, id: app.lastRun.runId, phase: "done", total: app.lastRun.noteCount, done: app.lastRun.noteCount, elapsedMs: app.lastRun.elapsedMs, trigger: app.lastRun.trigger }
      : initialRun,
    summary: app.lastRun?.summary ? { runId: app.lastRun.runId, text: app.lastRun.summary } : null,
  });
}

export function setLoadError(message: string): void {
  set({ loaded: true, loadError: message });
}

// ---- SSE ----------------------------------------------------------------------

export function handleEvent(ev: SseEvent): void {
  if (ev.type === "note") {
    pendingNotes.push({ noteId: ev.noteId, answers: ev.answers, error: ev.error });
  } else {
    pendingOther.push(ev);
  }
  if (frame === null) frame = requestAnimationFrame(flush);
}

function flush(): void {
  frame = null;
  const notes = pendingNotes;
  const others = pendingOther;
  pendingNotes = [];
  pendingOther = [];
  const now = performance.now();

  let next: State = state;
  const starts = others.filter((e) => e.type === "run-start");
  for (const e of starts) {
    if (e.type !== "run-start") continue;
    const { snapshots } = snapshotsFor(next);
    next = {
      ...next,
      baseline: snapshots,
      summary: null,
      failures: {},
      run: {
        id: e.runId,
        phase: "running",
        total: e.total,
        done: 0,
        toAsk: e.toAsk,
        fromCache: e.fromCache,
        startedAt: now,
        elapsedMs: null,
        trigger: e.trigger,
        askingCriterionIds: e.criterionIds,
        pauseMs: null,
        pauseUntil: null,
      },
    };
  }

  if (notes.length) {
    const answers = { ...next.answers };
    const arrivals = { ...next.arrivals };
    let failures = next.failures;
    for (const n of notes) {
      answers[n.noteId] = n.answers;
      arrivals[n.noteId] = now;
      if (n.error) failures = { ...failures, [n.noteId]: n.error };
    }
    next = { ...next, answers, arrivals, failures, run: { ...next.run, done: next.run.done + notes.length } };
  }

  for (const e of others) {
    switch (e.type) {
      case "run-complete":
        next = {
          ...next,
          lastRun: e.stats,
          run: { ...next.run, phase: "done", done: e.stats.noteCount, elapsedMs: e.stats.elapsedMs, pauseMs: null, pauseUntil: null },
        };
        break;
      case "run-error":
        next = { ...next, run: { ...next.run, phase: "cancelled", pauseMs: null, pauseUntil: null } };
        break;
      case "rate-limit":
        next = { ...next, run: { ...next.run, pauseMs: e.pauseMs, pauseUntil: now + e.pauseMs } };
        break;
      case "protocol":
        next = { ...next, protocol: e.protocol };
        break;
      case "summary":
        next = { ...next, summary: { runId: e.runId, text: e.summary }, summaryPending: false };
        break;
      default:
        break;
    }
  }
  if (next !== state) {
    state = next;
    emit();
  }
}

// ---- actions ------------------------------------------------------------------

export const actions = {
  setThreshold(t: number) {
    const v = Math.min(1, Math.max(0, Math.round(t * 100) / 100));
    try {
      localStorage.setItem("screener.threshold", JSON.stringify(v));
    } catch {
      /* per-viewer convenience only */
    }
    set({ threshold: v });
  },
  select(noteId: string | null) {
    set({ selectedNoteId: noteId });
  },
  setFilter(filter: Filter) {
    set({ filter });
  },
  setSort(sort: SortKey) {
    set({ sort });
  },
  setDrawer(drawer: Drawer) {
    set((s) => ({ drawer: s.drawer === drawer ? null : drawer }));
  },
  closeDrawer() {
    set({ drawer: null });
  },
  setTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("screener.theme", theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  setAutoRun(autoRun: boolean) {
    try {
      localStorage.setItem("screener.autoRun", JSON.stringify(autoRun));
    } catch {
      /* ignore */
    }
    set({ autoRun });
  },
  setProtocol(protocol: Protocol) {
    set({ protocol });
  },
  setRetries(retries: boolean) {
    set({ retries });
  },
  setClaude(claude: ClaudeStatus | null) {
    set({ claude });
  },
  setSummaryPending(v: boolean) {
    set({ summaryPending: v });
  },
  toast(text: string, kind: "info" | "error" = "info") {
    const id = Date.now();
    set({ toast: { id, text, kind } });
    setTimeout(() => {
      if (state.toast?.id === id) set({ toast: null });
    }, 4200);
  },
  markCancelled() {
    set((s) => ({ run: { ...s.run, phase: "cancelled" } }));
  },
  /** Apply a fresh server state after a full reset and drop every client-side trace of prior runs. */
  resetAll(app: AppState) {
    pendingNotes = [];
    pendingOther = [];
    hydrate(app);
    set({ arrivals: {}, baseline: null, selectedNoteId: null, filter: "all", summary: null, summaryPending: false, failures: {} });
  },
};
