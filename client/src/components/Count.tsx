import { useEffect, useRef, useState } from "react";

/**
 * A numeric readout whose digits cross-fade when they change: the incoming
 * digit rises into place while the outgoing one lifts away. Slots are keyed
 * from the right so a count going from 99 to 100 grows on the left.
 */
export function Count({ value, min = 1, className = "" }: { value: number; min?: number; className?: string }) {
  const text = String(Math.max(0, Math.round(value))).padStart(min, " ");
  const prevRef = useRef(text);
  const [prev, setPrev] = useState(text);
  useEffect(() => {
    if (prevRef.current !== text) {
      setPrev(prevRef.current);
      prevRef.current = text;
    }
  }, [text]);
  const width = Math.max(text.length, prev.length);
  const cur = text.padStart(width, " ");
  const old = prev.padStart(width, " ");
  return (
    <span className={`count data ${className}`} aria-label={text.trim()}>
      {Array.from({ length: width }, (_, i) => {
        const slot = width - i;
        const ch = cur[i] ?? " ";
        const before = old[i] ?? " ";
        const changed = ch !== before;
        return (
          <span className="digit" key={slot}>
            <span className={changed ? "digit-in" : ""} key={`${slot}-${ch}`}>
              {ch === " " ? " " : ch}
            </span>
            {changed && before !== " " && (
              <span className="digit-out" aria-hidden="true" key={`${slot}-${before}-out`}>
                {before}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
