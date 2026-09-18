import type { SseEvent } from "../../shared/types.js";

/** Connect to the event stream. Reconnects automatically (EventSource does). */
export function connectEvents(onEvent: (ev: SseEvent) => void, onOpen?: () => void): () => void {
  const source = new EventSource("/api/events");
  const types: SseEvent["type"][] = ["hello", "run-start", "note", "rate-limit", "run-complete", "run-error", "protocol", "summary"];
  for (const t of types) {
    source.addEventListener(t, (e) => {
      try {
        onEvent(JSON.parse((e as MessageEvent).data) as SseEvent);
      } catch {
        /* ignore malformed frames */
      }
    });
  }
  if (onOpen) source.addEventListener("open", onOpen);
  return () => source.close();
}
