// Use UTC for date matching to ensure consistency
export function getUTCDayKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function* weeklyDates(start: Date, end: Date, weekday: number) {
  const cur = new Date(start);
  // Set to noon UTC to avoid timezone shifts (e.g. 00:00 UTC -> 19:00 EST prev day)
  cur.setUTCHours(12, 0, 0, 0);

  // Advance to first matching weekday (UTC)
  while (cur.getUTCDay() !== weekday) {
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const endKey = getUTCDayKey(end);
  while (true) {
    const curKey = getUTCDayKey(cur);
    if (curKey > endKey) break;

    yield new Date(cur); // Returns a new Date object with same time

    cur.setUTCDate(cur.getUTCDate() + 7);
  }
}

export function computeEnd(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration;
  const hh = Math.floor((total % (24 * 60)) / 60.0);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const minute = m;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}
