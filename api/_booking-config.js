// Config + matemática pura de horários do agendador ("Fihan Meet — Agenda").
// Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Grade fixa configurável por env var (sem integração de calendário externo
// nesta rodada). Usado por api/availability.js (lista horários livres) e
// api/bookings.js (revalida um horário antes de confirmar — nunca confia
// cegamente no horário que o cliente mandou).
//
// Brasil não observa horário de verão desde 2019, então um offset fixo é
// seguro e não exige nenhuma dependência nova de timezone (luxon/date-fns-tz).
// Se a Fihan um dia precisar agendar em fuso com DST, troque a aritmética de
// offset fixo abaixo por um helper baseado em Intl.DateTimeFormat.

export const BOOKING_TIMEZONE_LABEL = process.env.BOOKING_TIMEZONE_LABEL || 'America/Sao_Paulo';
export const BOOKING_UTC_OFFSET_MINUTES = Number(process.env.BOOKING_UTC_OFFSET_MINUTES ?? -180);
export const BOOKING_WEEKDAYS = (process.env.BOOKING_WEEKDAYS || '1,2,3,4,5')
  .split(',')
  .map((n) => parseInt(n.trim(), 10))
  .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
export const BOOKING_START_TIME = process.env.BOOKING_START_TIME || '09:00';
export const BOOKING_END_TIME = process.env.BOOKING_END_TIME || '18:00';
export const BOOKING_SLOT_MINUTES = Number(process.env.BOOKING_SLOT_MINUTES || 30);
export const BOOKING_LEAD_MINUTES = Number(process.env.BOOKING_LEAD_MINUTES || 120);
export const BOOKING_DAYS_AHEAD = Number(process.env.BOOKING_DAYS_AHEAD || 14);

const parseHHMM = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return { h: 9, min: 0 };
  return { h: parseInt(m[1], 10), min: parseInt(m[2], 10) };
};

// "Meio-dia local" de uma data local (Y-M-D) convertido pro instante UTC
// equivalente a HH:mm naquele fuso fixo — sem depender do relógio local
// da máquina que roda a function (Vercel roda em UTC).
const localTimeToUtc = (year, month, day, hh, mm) => {
  const utcMinutes = hh * 60 + mm - BOOKING_UTC_OFFSET_MINUTES;
  return new Date(Date.UTC(year, month, day, 0, utcMinutes));
};

// Data "local" (no fuso fixo configurado) equivalente a um instante UTC —
// usada só pra descobrir o dia-da-semana/Y-M-D local a partir de `now`.
const utcToLocalParts = (date) => {
  const local = new Date(date.getTime() + BOOKING_UTC_OFFSET_MINUTES * 60000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: local.getUTCDay(),
  };
};

// Gera todos os horários abertos na janela configurada, já excluindo dias
// fora de BOOKING_WEEKDAYS e instantes dentro do buffer de antecedência
// mínima (BOOKING_LEAD_MINUTES). NÃO exclui horários já reservados — isso é
// responsabilidade de quem chama (cruzar com a tabela `bookings`).
export const generateSlots = ({ now = new Date() } = {}) => {
  const start = parseHHMM(BOOKING_START_TIME);
  const end = parseHHMM(BOOKING_END_TIME);
  const leadCutoff = new Date(now.getTime() + BOOKING_LEAD_MINUTES * 60000);
  const { year, month, day } = utcToLocalParts(now);

  const slots = [];
  for (let dayOffset = 0; dayOffset < BOOKING_DAYS_AHEAD; dayOffset++) {
    const cursor = new Date(Date.UTC(year, month, day + dayOffset));
    const weekday = cursor.getUTCDay();
    if (!BOOKING_WEEKDAYS.includes(weekday)) continue;

    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const d = cursor.getUTCDate();

    let cursorMinutes = start.h * 60 + start.min;
    const endMinutes = end.h * 60 + end.min;
    while (cursorMinutes + BOOKING_SLOT_MINUTES <= endMinutes) {
      const hh = Math.floor(cursorMinutes / 60);
      const mm = cursorMinutes % 60;
      const startUtc = localTimeToUtc(y, m, d, hh, mm);
      const endUtc = new Date(startUtc.getTime() + BOOKING_SLOT_MINUTES * 60000);
      if (startUtc >= leadCutoff) {
        slots.push({ startUtc, endUtc, dateLocal: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
      }
      cursorMinutes += BOOKING_SLOT_MINUTES;
    }
  }
  return slots;
};

// Confere se um horário (ISO string em UTC) pertence à grade aberta atual —
// usado pra rejeitar horários forjados no POST /api/bookings.
export const isValidSlot = (startUtcIso, { now = new Date() } = {}) => {
  const target = new Date(startUtcIso);
  if (Number.isNaN(target.getTime())) return false;
  return generateSlots({ now }).some((s) => s.startUtc.getTime() === target.getTime());
};
