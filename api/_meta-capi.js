// Shared helper — Meta Conversions API (server-side events).
// Prefixed with "_" so Vercel does NOT expose it as an HTTP endpoint.
//
// Sends events server-to-server to complement the browser Meta Pixel. Meta
// deduplicates the two by (event_name + event_id), so the browser Pixel and
// this server event MUST share the same event_id for a given conversion.
//
// Required env vars:
//   META_CAPI_TOKEN     — System User access token (Events Manager → Settings)
// Optional:
//   META_PIXEL_ID       — defaults to the site pixel id
//   META_TEST_EVENT_CODE — set while validating in "Test Events", remove in prod

import crypto from 'node:crypto';

const PIXEL_ID = process.env.META_PIXEL_ID || '888400407002791';
const GRAPH_VERSION = 'v21.0';

const sha256 = (val) => crypto.createHash('sha256').update(val).digest('hex');

// Normalize then SHA-256 a single PII field. Returns undefined for empty input.
const hashField = (val, { digitsOnly = false } = {}) => {
  if (val == null) return undefined;
  let s = String(val).trim().toLowerCase();
  if (digitsOnly) s = s.replace(/\D/g, '');
  if (!s) return undefined;
  return sha256(s);
};

// Build the user_data object Meta expects: PII hashed, signals (fbp/fbc/ip/ua) raw.
export const buildUserData = ({
  email,
  phone,
  firstName,
  lastName,
  country = 'br',
  fbp,
  fbc,
  clientIp,
  clientUserAgent,
} = {}) => {
  const ud = {};
  const em = hashField(email);
  const ph = hashField(phone, { digitsOnly: true });
  const fn = hashField(firstName);
  const ln = hashField(lastName);
  const ct = hashField(country);
  if (em) ud.em = [em];
  if (ph) ud.ph = [ph];
  if (fn) ud.fn = [fn];
  if (ln) ud.ln = [ln];
  if (ct) ud.country = [ct];
  if (fbp) ud.fbp = fbp; // raw — Meta browser pixel cookie
  if (fbc) ud.fbc = fbc; // raw — Meta click id cookie
  if (clientIp) ud.client_ip_address = clientIp;
  if (clientUserAgent) ud.client_user_agent = clientUserAgent;
  return ud;
};

// Extract the originating client IP behind Vercel's proxy.
export const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || undefined;
};

// Post one event to the Conversions API. Never throws — returns a status object
// so the caller can ignore failures (CAPI is a best-effort enhancement).
export const sendMetaCapiEvent = async ({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  actionSource = 'website',
  userData,
  customData,
}) => {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { ok: false, skipped: 'no_token' };

  const event = {
    event_name: eventName,
    event_time: eventTime || Math.floor(Date.now() / 1000),
    action_source: actionSource,
    user_data: userData || {},
    ...(eventId ? { event_id: eventId } : {}),
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
    ...(customData ? { custom_data: customData } : {}),
  };

  const body = {
    data: [event],
    ...(process.env.META_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[meta-capi] error', r.status, out?.error || out);
      return { ok: false, status: r.status, error: out?.error || out };
    }
    return { ok: true, result: out };
  } catch (err) {
    console.error('[meta-capi] network error', err.message);
    return { ok: false, error: err.message };
  }
};
