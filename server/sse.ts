import type { ServerResponse } from "node:http";
import type { SseEvent } from "../shared/types.js";

/** Registry of connected browsers. Events are fanned out as they land. */
export class SseHub {
  private clients = new Set<ServerResponse>();
  private heartbeat: NodeJS.Timeout | null = null;

  add(res: ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
    if (!this.heartbeat) {
      this.heartbeat = setInterval(() => {
        for (const c of this.clients) c.write(": ping\n\n");
      }, 15_000);
      this.heartbeat.unref();
    }
  }

  send(event: SseEvent): void {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const c of this.clients) c.write(payload);
  }

  get size(): number {
    return this.clients.size;
  }
}
