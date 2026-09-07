/**
 * Converts a 24-hour "HH:MM" time string to traditional Swahili time-of-day
 * reckoning ("Saa N:MM <kipindi>"). The Swahili day begins at sunrise
 * (~6am), so the Swahili hour is the 24-hour clock hour offset by 6 (mod
 * 12, with 0 shown as 12) -- e.g. 07:00 is "Saa 1 Asubuhi", noon is
 * "Saa 6 Mchana", 18:00 is "Saa 12 Jioni", midnight is "Saa 6 Usiku".
 *
 * The asubuhi/mchana/jioni/usiku period boundaries below are the commonly
 * taught approximate ranges, not a precise cultural/religious definition --
 * real usage varies by region and speaker.
 */
export function formatSwahiliTime(time24: string | null | undefined): string | null {
  if (!time24) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(time24.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute)) {
    return null;
  }

  const swahiliHour = ((hour - 6 + 24) % 12) || 12;
  const period =
    hour >= 5 && hour < 12 ? "Asubuhi" :
    hour >= 12 && hour < 16 ? "Mchana" :
    hour >= 16 && hour < 19 ? "Jioni" :
    "Usiku";

  return `Saa ${swahiliHour}:${String(minute).padStart(2, "0")} ${period}`;
}
