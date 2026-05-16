// Short formatters for the Members table. Kept in a tiny module so both
// the Members page (server) and any future client surface (e.g. profile
// drawer) can share the same labels.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatJoinedDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const ONLINE_WINDOW_SECONDS = 5 * 60;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = DAY * 7;

/**
 * Returns { label, online } — "Online" within the last 5 minutes,
 * "Xm ago" / "Xh ago" / "Xd ago" / "Xw ago" / absolute date otherwise.
 * Null timestamps render as "—".
 */
export function formatLastSeen(iso: string | null | undefined): {
  label: string;
  online: boolean;
} {
  if (!iso) return { label: "—", online: false };
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return { label: "—", online: false };
  const now = Date.now();
  const ageSec = Math.max(0, Math.round((now - ts) / 1000));
  if (ageSec <= ONLINE_WINDOW_SECONDS) return { label: "Online", online: true };
  if (ageSec < HOUR) return { label: `${Math.floor(ageSec / MINUTE)}m ago`, online: false };
  if (ageSec < DAY) return { label: `${Math.floor(ageSec / HOUR)}h ago`, online: false };
  if (ageSec < WEEK) return { label: `${Math.floor(ageSec / DAY)}d ago`, online: false };
  const d = new Date(ts);
  return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, online: false };
}
