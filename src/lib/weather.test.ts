import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastUrl, formatSlotTime, isVillageCode, upcomingSlots } from './weather.ts';
import type { ForecastSlot } from './weather.ts';

const slot = (datetime: string): ForecastSlot => ({ datetime, t: 28, hu: 76, ws: 12.7, wd: 'SE', weather_desc: 'Berawan', image: '' });
const response = {
  data: [{
    cuaca: [
      [slot('2026-10-28T02:00:00Z'), slot('2026-10-28T05:00:00Z'), slot('2026-10-28T08:00:00Z')],
      [slot('2026-10-28T17:00:00Z'), slot('2026-10-28T20:00:00Z')],
    ],
  }],
};

test('only Kemendagri village codes are accepted', () => {
  assert.equal(isVillageCode('33.05.09.2012'), true);
  for (const code of ['33.05.09', '3305092012', '33.05.09.2012 ', undefined, 33]) assert.equal(isVillageCode(code), false);
});

test('the forecast URL asks for one village', () => {
  assert.equal(forecastUrl('33.05.09.2012'), 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=33.05.09.2012');
});

test('upcoming slots start with the one in progress and continue across days', () => {
  const now = Date.parse('2026-10-28T06:30:00Z');
  assert.deepEqual(upcomingSlots(response, now).map((item) => item.datetime), [
    '2026-10-28T05:00:00Z', '2026-10-28T08:00:00Z', '2026-10-28T17:00:00Z', '2026-10-28T20:00:00Z',
  ]);
  assert.equal(upcomingSlots(response, now, 2).length, 2);
  assert.deepEqual(upcomingSlots({}, now), []);
});

test('slot times are local, with the weekday once the day changes', () => {
  const now = Date.parse('2026-10-28T06:30:00Z');
  assert.equal(formatSlotTime(slot('2026-10-28T05:00:00Z'), 'Asia/Jakarta', now), '12.00');
  // 17:00 UTC is midnight in Jakarta, the next local day.
  assert.match(formatSlotTime(slot('2026-10-28T17:00:00Z'), 'Asia/Jakarta', now), /^Kam 00\.00$/);
});
