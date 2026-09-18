// Date helpers for truth sampling. All arithmetic is relative to a fixed
// reference date (not `new Date()`) so that `--seed N --count M` produces
// byte-identical output regardless of what day the generator is actually run.

/** Fixed "today" for relative date math. Keeps generation deterministic across days. */
export const REFERENCE_DATE = new Date("2026-09-18T00:00:00Z");

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shifted(days: number): Date {
  const d = new Date(REFERENCE_DATE);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function daysAgo(days: number): string {
  return isoDate(shifted(days));
}

export function monthsAgo(months: number): string {
  return daysAgo(Math.round(months * 30.44));
}

export function yearsAgo(years: number): string {
  return daysAgo(Math.round(years * 365.25));
}

/** `date` shifted back by `months`, for chaining relative to a value other than REFERENCE_DATE (e.g. keeping a "prior" reading before a lab date that was itself moved). */
export function monthsBefore(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - Math.round(months * 30.44));
  return isoDate(d);
}
