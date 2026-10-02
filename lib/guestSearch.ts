/**
 * Client-side guest search for the check-in page's "Search by name" tab. Runs over the guest
 * list already loaded for the selected event, so typing never hits the network.
 *
 * A guest matches when ANY of these match:
 * - name: every word typed appears somewhere in the name, in any order and ignoring case and
 *   accents ("mwi jo" finds "John Mwita");
 * - phone: the typed digits appear in the phone number, with 0... and 255... treated as the same
 *   local number ("0712" finds "255712345678");
 * - Pass ID: the typed code appears in the Pass ID, with or without the SEP- prefix.
 */

export type SearchableGuest = {
  full_name: string;
  phone: string | null;
  event_pass_id: string | null;
};

export const MIN_GUEST_SEARCH_LENGTH = 2;
export const MAX_GUEST_SEARCH_RESULTS = 20;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

// Tanzanian numbers are stored both as 07XXXXXXXX and 2557XXXXXXXX.
function localDigits(digits: string) {
  if (digits.startsWith("255")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function passCore(value: string) {
  return value.toUpperCase().replace(/^SEP-?/, "").replace(/[^A-Z0-9]/g, "");
}

export function searchGuests<T extends SearchableGuest>(guests: T[], query: string): { results: T[]; total: number } {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < MIN_GUEST_SEARCH_LENGTH) return { results: [], total: 0 };

  const tokens = normalizedQuery.split(" ");
  const queryDigits = digitsOf(query);
  // Only treat the query as a phone number when it is mostly digits, so "John 2" doesn't
  // match every phone containing a 2.
  const isPhoneQuery = queryDigits.length >= 3 && queryDigits.length >= normalizedQuery.replace(/[\s+\-()]/g, "").length;
  const queryPass = passCore(query);
  const isPassQuery = queryPass.length >= 3 && !normalizedQuery.includes(" ");

  const ranked: { guest: T; rank: number }[] = [];
  for (const guest of guests) {
    const name = normalizeText(guest.full_name);
    const pass = guest.event_pass_id ? passCore(guest.event_pass_id) : "";
    const phone = guest.phone ? digitsOf(guest.phone) : "";

    let rank = -1;
    if (isPassQuery && pass && pass === queryPass) rank = 0;
    else if (name.startsWith(normalizedQuery)) rank = 1;
    else if (tokens.every((token) => name.includes(token))) rank = 2;
    else if (isPassQuery && pass.includes(queryPass)) rank = 3;
    else if (isPhoneQuery && phone && (phone.includes(queryDigits) || localDigits(phone).includes(localDigits(queryDigits)))) rank = 3;

    if (rank >= 0) ranked.push({ guest, rank });
  }

  // Stable sort keeps the incoming (alphabetical) order within each rank.
  ranked.sort((a, b) => a.rank - b.rank);
  return { results: ranked.slice(0, MAX_GUEST_SEARCH_RESULTS).map((entry) => entry.guest), total: ranked.length };
}
