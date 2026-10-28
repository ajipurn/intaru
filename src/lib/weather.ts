// BMKG open data: a three-day forecast per village (Kemendagri level-IV code) in
// three-hour slots. The API allows 60 requests per minute per IP and requires BMKG
// to be credited; responses are cacheable for an hour.
export const BMKG_FORECAST_URL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
export const BMKG_SOURCE_URL = 'https://data.bmkg.go.id/prakiraan-cuaca/';
const SLOT_HOURS = 3;

export type ForecastSlot = {
  /** UTC start of the slot, e.g. 2026-10-28T02:00:00Z. */
  datetime: string;
  t: number;
  hu: number;
  ws: number;
  wd: string;
  weather_desc: string;
  image: string;
};
export type ForecastResponse = {
  lokasi?: { desa?: string; timezone?: string };
  data?: { cuaca?: ForecastSlot[][] }[];
};

export const isVillageCode = (code: unknown): code is string => typeof code === 'string' && /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(code);

export const forecastUrl = (code: string) => `${BMKG_FORECAST_URL}?adm4=${encodeURIComponent(code)}`;

/** The slot in progress and the ones after it, across BMKG's per-day lists. */
export function upcomingSlots(response: ForecastResponse, now = Date.now(), count = 4) {
  const slots = (response.data?.[0]?.cuaca ?? []).flat();
  return slots.filter((slot) => Date.parse(slot.datetime) + SLOT_HOURS * 3_600_000 > now).slice(0, count);
}

/** Local start time, with the weekday when the slot is not on the current local day. */
export function formatSlotTime(slot: ForecastSlot, timeZone = 'Asia/Jakarta', now = Date.now()) {
  const start = new Date(slot.datetime);
  const time = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone });
  const day = (date: Date) => date.toLocaleDateString('id-ID', { timeZone });
  return day(start) === day(new Date(now)) ? time : `${start.toLocaleDateString('id-ID', { weekday: 'short', timeZone })} ${time}`;
}
