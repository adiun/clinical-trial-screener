// Bounded concurrency with a shared pause gate. When one worker is told to
// back off (429), every worker waits for the same deadline instead of piling
// on retries.

export class PauseGate {
  private until = 0;
  private pauses = 0;

  pause(ms: number): void {
    const deadline = Date.now() + ms;
    if (deadline > this.until) {
      this.until = deadline;
      this.pauses++;
    }
  }

  get pauseCount(): number {
    return this.pauses;
  }

  async wait(signal?: AbortSignal): Promise<void> {
    while (Date.now() < this.until) {
      if (signal?.aborted) return;
      await new Promise((r) => setTimeout(r, Math.min(50, this.until - Date.now())));
    }
  }
}

export interface PoolOptions {
  concurrency: number;
  signal?: AbortSignal;
  gate?: PauseGate;
}

/**
 * Run `worker` over `items` with at most `concurrency` in flight. Results are
 * handed to `onResult` in completion order. Worker errors do not stop the pool;
 * they are handed to `onError`.
 */
export async function runPool<T>(
  items: readonly T[],
  opts: PoolOptions,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const concurrency = Math.max(1, Math.min(opts.concurrency, items.length || 1));
  let next = 0;
  const lanes = Array.from({ length: concurrency }, async () => {
    while (true) {
      if (opts.signal?.aborted) return;
      const i = next++;
      if (i >= items.length) return;
      if (opts.gate) await opts.gate.wait(opts.signal);
      const item = items[i] as T;
      await worker(item, i);
    }
  });
  await Promise.all(lanes);
}
