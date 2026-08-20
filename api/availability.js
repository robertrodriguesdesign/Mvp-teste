// Vercel Serverless Function — GET /api/availability
//
// Endpoint PÚBLICO (sem login) usado pela tela de agendamento em /contatos.
// Devolve os horários abertos da grade fixa configurável (api/_booking-config.js),
// já excluindo os que estiverem reservados (api/_bookings-db.js).
//
//   GET /api/availability?days=14

import {
  generateSlots,
  BOOKING_TIMEZONE_LABEL,
  BOOKING_UTC_OFFSET_MINUTES,
  BOOKING_SLOT_MINUTES,
  BOOKING_DAYS_AHEAD,
} from './_booking-config.js';
import { listBookedStarts } from './_bookings-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedDays = parseInt((req.query?.days || '').toString(), 10);
  const days = Number.isFinite(requestedDays) && requestedDays > 0
    ? Math.min(requestedDays, BOOKING_DAYS_AHEAD)
    : BOOKING_DAYS_AHEAD;

  const now = new Date();
  const allSlots = generateSlots({ now }).filter((s) => {
    const dayIndex = Math.floor((s.startUtc - now) / (24 * 60 * 60 * 1000));
    return dayIndex < days;
  });

  if (!allSlots.length) {
    return res.status(200).json({
      ok: true,
      timezoneLabel: BOOKING_TIMEZONE_LABEL,
      utcOffsetMinutes: BOOKING_UTC_OFFSET_MINUTES,
      slotMinutes: BOOKING_SLOT_MINUTES,
      days: [],
    });
  }

  let bookedTimes = [];
  try {
    const from = allSlots[0].startUtc.toISOString();
    const to = allSlots[allSlots.length - 1].startUtc.toISOString();
    bookedTimes = await listBookedStarts(from, to);
  } catch (err) {
    console.error('[availability] db_error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
  const bookedSet = new Set(bookedTimes);

  const byDate = new Map();
  for (const slot of allSlots) {
    if (bookedSet.has(slot.startUtc.getTime())) continue;
    if (!byDate.has(slot.dateLocal)) byDate.set(slot.dateLocal, []);
    byDate.get(slot.dateLocal).push({
      startUtc: slot.startUtc.toISOString(),
      endUtc: slot.endUtc.toISOString(),
    });
  }

  const daysOut = Array.from(byDate.entries()).map(([date, slots]) => ({ date, slots }));

  return res.status(200).json({
    ok: true,
    timezoneLabel: BOOKING_TIMEZONE_LABEL,
    utcOffsetMinutes: BOOKING_UTC_OFFSET_MINUTES,
    slotMinutes: BOOKING_SLOT_MINUTES,
    days: daysOut,
  });
}
