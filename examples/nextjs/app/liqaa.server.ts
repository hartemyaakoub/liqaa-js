import 'server-only';
import crypto from 'node:crypto';

const PK = process.env.LIQAA_PK!;
const SK = process.env.LIQAA_SK!;

export async function exchangeIdentityForSdkToken(user: {
  email: string;
  name: string;
}): Promise<string> {
  const identity = Buffer.from(
    JSON.stringify({ email: user.email, name: user.name, ts: Math.floor(Date.now() / 1000) })
  ).toString('base64');

  const signature = crypto.createHmac('sha256', SK).update(identity).digest('hex');

  const r = await fetch('https://liqaa.io/api/public/v1/sdk-token', {
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
    cache: 'no-store',
  });

  if (!r.ok) {
    throw new Error(`LIQAA sdk-token exchange failed: ${r.status}`);
  }
  const { sdk_token } = (await r.json()) as { sdk_token: string };
  return sdk_token;
}
