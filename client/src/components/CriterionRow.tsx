import { useEffect, useRef, useState } from "react";
import type { Criterion, CriterionInput } from "../../../shared/types.js";
import { api } from "../api.js";
import { actions, useStore } from "../store.js";
import { IconChevronDown, IconTrash } from "./icons.js";

interface Props {
  criterion: Criterion;
  index: number;
  onChanged: (c: Criterion) => void;
}

export function CriterionRow({ criterion: c, index, onChanged }: Props) {
  const asking = useStore((s) => s.run.phase === "running" && s.run.askingCriterionIds.includes(c.id));
  const [open, setOpen] = useState(false);

  const patch = async (p: Partial<CriterionInput>) => {
    try {
      const updated = await api.updateCriterion(c.id, p);
      onChanged(updated);
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const remove = async () => {
    try {
      await api.deleteCriterion(c.id);
    } catch (err) {
      actions.toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  return (
    <li className={`crit${asking ? " asking" : ""}${open ? " open" : ""}`}>
      <div className="crit-head">
        <span className="crit-index data">{String(index + 1).padStart(2, "0")}</span>
        <EditableText className="crit-name" value={c.name} onCommit={(v) => patch({ name: v })} ariaLabel="Criterion name" />
        <button className={`kind-tag kind-${c.kind}`} onClick={() => patch({ kind: c.kind === "inclusion" ? "exclusion" : "inclusion" })} title="Toggle inclusion / exclusion">
          {c.kind === "inclusion" ? "INCL" : "EXCL"}
        </button>
        <button className="prim-tag data" onClick={() => patch({ primitive: c.primitive === "noul" ? "score" : "noul", levels: c.primitive === "noul" ? ["Not documented", "Documented"] : null, metLevels: c.primitive === "noul" ? [1] : null })} title="Toggle Noul (yes/no) / Score (graded)">
          {c.primitive === "noul" ? "NOUL" : "SCORE"}
        </button>
        <button className={`disclose${open ? " open" : ""}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Hide details" : "Show details"}>
          <IconChevronDown />
        </button>
      </div>
      <EditableText className="crit-question" value={c.question} multiline onCommit={(v) => patch({ question: v })} ariaLabel="Question sent to Jev" placeholder="Question sent to Jev…" />
      {open && (
        <div className="crit-more">
          {c.primitive === "noul" ? (
            <>
              <div className="field">
                <span className="label">Yes means</span>
                <EditableText className="crit-desc" value={c.trueDescription ?? ""} multiline onCommit={(v) => patch({ trueDescription: v || null })} placeholder="What a yes means…" ariaLabel="Description of a yes answer" />
              </div>
              <div className="field">
                <span className="label">No means</span>
                <EditableText className="crit-desc" value={c.falseDescription ?? ""} multiline onCommit={(v) => patch({ falseDescription: v || null })} placeholder="What a no means…" ariaLabel="Description of a no answer" />
              </div>
            </>
          ) : (
            <LevelsEditor criterion={c} onPatch={patch} />
          )}
          <div className="field field-row">
            <label className="label" htmlFor={`w-${c.id}`}>
              Weight
            </label>
            <input id={`w-${c.id}`} className="data weight" type="number" min={0} max={1} step={0.1} defaultValue={c.weight} onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== c.weight) void patch({ weight: Math.min(1, Math.max(0, v)) });
            }} />
            <span className="hash data" title="Hash of the question as sent to Jev. Changes when the question changes; answers are cached by it.">
              {c.hash.slice(0, 8)}
            </span>
            <button className="iconbtn danger" onClick={remove} aria-label={`Delete criterion ${c.name}`} title="Delete criterion">
              <IconTrash />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function LevelsEditor({ criterion: c, onPatch }: { criterion: Criterion; onPatch: (p: Partial<CriterionInput>) => Promise<void> }) {
  const levels = c.levels ?? [];
  const met = new Set(c.metLevels ?? []);
  const setLevel = (i: number, v: string) => {
    const next = [...levels];
    next[i] = v;
    void onPatch({ levels: next });
  };
  const toggleMet = (i: number) => {
    const next = new Set(met);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    void onPatch({ metLevels: [...next].sort((a, b) => a - b) });
  };
  return (
    <div className="levels">
      <span className="label">Levels (low to high) · tick the ones that count as met</span>
      <ol className="levels-list">
        {levels.map((l, i) => (
          <li key={i} className="level">
            <input type="checkbox" checked={met.has(i)} onChange={() => toggleMet(i)} aria-label={`Level ${i} counts as met`} />
            <span className="level-index data">{i}</span>
            <EditableText className="level-text" value={l} onCommit={(v) => setLevel(i, v)} ariaLabel={`Level ${i} description`} />
            <button
              className="iconbtn danger"
              onClick={() => {
                if (levels.length <= 2) return;
                const next = levels.filter((_, j) => j !== i);
                const nextMet = [...met].filter((j) => j !== i).map((j) => (j > i ? j - 1 : j));
                void onPatch({ levels: next, metLevels: nextMet });
              }}
              disabled={levels.length <= 2}
              aria-label={`Remove level ${i}`}
            >
              <IconTrash size={14} />
            </button>
          </li>
        ))}
      </ol>
      <button className="textbtn" onClick={() => void onPatch({ levels: [...levels, "New level"] })} disabled={levels.length >= 6}>
        + Add level
      </button>
    </div>
  );
}

/**
 * Inline editable text. Commits on Enter (or blur), reverts on Escape. Shift+Enter
 * inserts a newline in multiline mode. Feels like editing a spec line, not a form.
 */
export function EditableText({
  value,
  onCommit,
  className = "",
  multiline = false,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onCommit: (v: string) => void | Promise<void>;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  useEffect(() => {
    setDraft(value);
    committed.current = value;
  }, [value]);

  const commit = () => {
    const v = draft.trim();
    if (v !== committed.current.trim()) {
      committed.current = v;
      void onCommit(v);
    }
  };

  const shared = {
    className: `editable ${className}`,
    value: draft,
    placeholder,
    "aria-label": ariaLabel,
    spellCheck: false,
    onBlur: commit,
  };

  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `px`;
  }, [draft, multiline]);

  if (multiline) {
    return (
      <textarea
        ref={areaRef}
        {...shared}
        rows={1}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onFocus={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          } else if (e.key === "Escape") {
            setDraft(committed.current);
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />
    );
  }
  return (
    <input
      {...shared}
      type="text"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        else if (e.key === "Escape") {
          setDraft(committed.current);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
