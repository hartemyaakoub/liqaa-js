/**
 * Server-side SDK token exchange (Node.js / Express).
 *
 * Mount this as POST /api/liqaa/sdk-token on your backend. It signs the
 * authenticated user's identity with sk_live_, exchanges for a 1-hour
 * browser-safe JWT, and returns it to the client.
 *
 * Requires Node 18+ (built-in fetch).
 */
const crypto = require('node:crypto');

const PK = process.env.LIQAA_PK;        // pk_live_…
const SK = process.env.LIQAA_SK;        // sk_live_… — server-only

if (!PK || !SK) {
  throw new Error('Set LIQAA_PK and LIQAA_SK in your environment');
}

async function exchangeIdentityForSdkToken({ email, name }) {
  const identity = Buffer.from(
    JSON.stringify({ email, name, ts: Math.floor(Date.now() / 1000) })
  ).toString('base64');

  const signature = crypto.createHmac('sha256', SK).update(identity).digest('hex');

  const res = await fetch('https://liqaa.io/api/public/v1/sdk-token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_key: PK,
      identity_base64: identity,
      signature,
    }),
  });

  if (!res.ok) {
    throw new Error(`sdk-token exchange failed: HTTP ${res.status}`);
  }
  return res.json(); // { sdk_token, expires_at }
}

// ── Express handler ───────────────────────────────────────────
//   const express = require('express');
//   const app = express();
//   app.use(express.json());
//   app.post('/api/liqaa/sdk-token', sdkTokenHandler);
async function sdkTokenHandler(req, res) {
  // Authenticate the visitor here — replace with your real auth.
  const user = req.user; // { email, name }
  if (!user) return res.status(401).json({ error: 'unauthenticated' });

  try {
    const data = await exchangeIdentityForSdkToken(user);
    res.json(data);
  } catch (e) {
    console.error('LIQAA exchange failed', e);
    res.status(500).json({ error: 'sdk-token exchange failed' });
  }
}

module.exports = { exchangeIdentityForSdkToken, sdkTokenHandler };
