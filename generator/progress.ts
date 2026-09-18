// Single-line progress bar on stderr. No dependency, no terminal cursor
// tricks beyond \r — good enough for a CLI that mostly runs unattended.
export class ProgressBar {
  private done = 0;
  private failed = 0;
  private readonly total: number;
  private readonly startedAt = Date.now();
  private readonly isTty: boolean;

  constructor(total: number) {
    this.total = total;
    this.isTty = Boolean(process.stderr.isTTY);
  }

  increment(ok: boolean): void {
    this.done++;
    if (!ok) this.failed++;
    this.render();
  }

  private render(): void {
    const width = 30;
    const frac = this.total === 0 ? 1 : this.done / this.total;
    const filled = Math.round(width * frac);
    const bar = "#".repeat(filled) + "-".repeat(width - filled);
    const elapsedSec = (Date.now() - this.startedAt) / 1000;
    const rate = elapsedSec > 0 ? this.done / elapsedSec : 0;
    const etaSec = rate > 0 ? Math.max(0, (this.total - this.done) / rate) : 0;
    const line = `[${bar}] ${this.done}/${this.total} notes  ${this.failed} failed  eta ${formatDuration(etaSec)}`;
    if (this.isTty) {
      process.stderr.write(`\r${line}`);
    } else if (this.done % 25 === 0 || this.done === this.total) {
      process.stderr.write(`${line}\n`);
    }
  }

  finish(): void {
    if (this.isTty) process.stderr.write("\n");
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "?";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m${rem.toString().padStart(2, "0")}s`;
}
