import { useEffect, useRef, useState } from "react";
import type { Criterion } from "../../../shared/types.js";
import { api } from "../api.js";
import { actions, getState, useStore } from "../store.js";
import { CriterionRow } from "./CriterionRow.js";
import { IconBraces, IconPlus, IconReset, IconSparkle } from "./icons.js";

const EDIT_DEBOUNCE_MS = 500;

export function Rail() {
  const protocol = useStore((s) => s.protocol);
  const claude = useStore((s) => s.claude);
  const drawer = useStore((s) => s.drawer);
  const [description, setDescription] = useState("");
  const [compiling, setCompiling] = useState(false);
  const debounce = useRef<number | null>(null);

  // Any committed edit re-asks only the changed criterion (the cache handles
  // the rest). Debounced so a burst of edits becomes one run.
  const scheduleRun = () => {
    if (!getState().autoRun) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      const s = getState();
      if (!s.notesLoaded) return;
      api.run(s.threshold, "edit").catch((err) => actions.toast(err instanceof Error ? err.message : String(err), "error"));
    }, EDIT_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (debounce.current) window.clearTimeout(debounce.current);
  }, []);

  const onChanged = (updated: Criterion) => {
    const s = getState();
    if (!s.protocol) return;
    const before = s.protocol.criteria.find((c) => c.id === updated.id);
    // The protocol event will arrive over SSE too; apply locally for immediacy.
    actions.setProtocol({ ...s.protocol, criteria: s.protocol.criteria.map((c) => (c.id === updated.id ? updated : c)) });
    if (before && before.hash !== updated.hash) scheduleRun();
  };

  const compile = async () => {
    if (!description.trim()) return;
    if (!claude?.configured) {
      actions.setDrawer("claude");
      actions.toast("Add Claude credentials first.", "info");
      return;
    }
    setCompiling(true);
    try {
      const p = await api.compile(description);
      actions.setProtocol(p);
      actions.toast(`Compiled ${p.criteria.length} criteria. Edit anything, then run.`);
      scheduleRun();
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setCompiling(false);
    }
  };

  const add = async () => {
    try {
      const c = await api.addCriterion({
        name: "New criterion",
        kind: "inclusion",
        primitive: "noul",
        question: "",
        trueDescription: null,
        falseDescription: null,
        levels: null,
        metLevels: null,
        weight: 1,
      });
      const s = getState();
      if (s.protocol) actions.setProtocol({ ...s.protocol, criteria: [...s.protocol.criteria, c] });
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const reset = async () => {
    try {
      const p = await api.resetProtocol();
      actions.setProtocol(p);
      scheduleRun();
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  if (!protocol) return <aside className="rail" aria-label="Protocol" />;

  return (
    <aside className="rail" aria-label="Protocol">
      <section className="compiler">
        <label className="label" htmlFor="describe">
          Describe the trial in plain English
        </label>
        <textarea
          id="describe"
          className="describe"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Adults 40–70 with type 2 diabetes on metformin, HbA1c between 7 and 10, eGFR at least 45, no pancreatitis, not on insulin…"
          spellCheck={false}
        />
        <div className="compiler-actions">
          <button className="primary" onClick={compile} disabled={compiling || !description.trim()}>
            <IconSparkle />
            <span>{compiling ? "Compiling…" : "Compile with Claude"}</span>
          </button>
          <button className={`iconbtn${drawer === "json" ? " active" : ""}`} onClick={() => actions.setDrawer("json")} aria-pressed={drawer === "json"} title="Show compiled JSON">
            <IconBraces />
            <span>JSON</span>
          </button>
        </div>
      </section>

      <section className="protocol" aria-label="Eligibility criteria">
        <div className="protocol-head">
          <div>
            <h1 className="protocol-name">{protocol.name}</h1>
            {protocol.description && <p className="protocol-desc">{protocol.description}</p>}
          </div>
          <button className="iconbtn" onClick={reset} title="Restore the default protocol" aria-label="Restore the default protocol">
            <IconReset />
          </button>
        </div>
        <ol className="crit-list">
          {protocol.criteria.map((c, i) => (
            <CriterionRow key={c.id} criterion={c} index={i} onChanged={onChanged} />
          ))}
        </ol>
        <button className="textbtn add-crit" onClick={add}>
          <IconPlus size={14} />
          <span>Add criterion</span>
        </button>
        <p className="rail-hint">Enter or click away commits an edit. Only the edited criterion is re-asked across all notes; unchanged criteria come from cache.</p>
      </section>
    </aside>
  );
}
