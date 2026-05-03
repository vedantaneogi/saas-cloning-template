const TIME = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATE_SHORT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const DATE_FULL = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCommentTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${TIME.format(d)} Today`;
  const oneDay = 24 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() - oneDay);
  if (d.toDateString() === yesterday.toDateString()) {
    return `${TIME.format(d)} Yesterday`;
  }
  if (d.getFullYear() === now.getFullYear()) return DATE_SHORT.format(d);
  return DATE_FULL.format(d);
}
