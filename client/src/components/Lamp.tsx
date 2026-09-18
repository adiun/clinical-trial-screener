import type { CriterionKind, CriterionStatus, NoteStatus } from "../../../shared/types.js";

/**
 * The lamp glyph. Shape encodes whether the condition holds (filled) or is
 * absent (hollow), half-filled means uncertain, a dim hollow means pending.
 * Color encodes favorability for eligibility, so the shape stays readable
 * without color and the color adds the trial reading.
 */
export function Lamp({ status, kind, blip, title }: { status: CriterionStatus; kind: CriterionKind; blip?: boolean; title?: string }) {
  let tone: "ok" | "bad" | "warn" | "off";
  if (status === "pending") tone = "off";
  else if (status === "uncertain") tone = "warn";
  else {
    const favorable = kind === "inclusion" ? status === "met" : status === "not_met";
    tone = favorable ? "ok" : "bad";
  }
  const className = `lamp lamp-${status} tone-${tone}${blip ? " blip" : ""}`;
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" role="img" aria-label={title ?? status.replace("_", " ")}>
      {status === "met" && <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />}
      {status === "not_met" && <rect x="1.75" y="1.75" width="6.5" height="6.5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {status === "uncertain" && (
        <>
          <rect x="1.75" y="1.75" width="6.5" height="6.5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1" y="1" width="4" height="8" rx="1" fill="currentColor" />
        </>
      )}
      {status === "pending" && <rect x="1.75" y="1.75" width="6.5" height="6.5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />}
    </svg>
  );
}

/** A note's rollup status, or "failed" when its Jev request errored and was not retried. */
export type RowStatus = NoteStatus | "failed";

export const STATUS_WORD: Record<RowStatus, string> = {
  eligible: "Eligible",
  ineligible: "Ineligible",
  review: "Review",
  pending: "Pending",
  failed: "Failed",
};

/** Status field: glyph plus word. Never color alone. */
export function StatusField({ status, compact }: { status: RowStatus; compact?: boolean }) {
  return (
    <span className={`status status-${status}`}>
      <svg className="status-glyph" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {status === "eligible" && (
          <>
            <rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" />
            <path d="M3.5 6.2 5.3 8 8.6 4.4" fill="none" stroke="var(--on-status)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {status === "ineligible" && (
          <>
            <rect x="1.75" y="1.75" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.2 4.2l3.6 3.6M7.8 4.2 4.2 7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {status === "review" && (
          <>
            <rect x="1.75" y="1.75" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="1" width="5" height="10" rx="1.5" fill="currentColor" />
          </>
        )}
        {status === "pending" && <rect x="1.75" y="1.75" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />}
        {status === "failed" && (
          <>
            <rect x="1.75" y="1.75" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 3.6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="6" cy="8.6" r="0.9" fill="currentColor" />
          </>
        )}
      </svg>
      {!compact && <span className="status-word">{STATUS_WORD[status]}</span>}
    </span>
  );
}
