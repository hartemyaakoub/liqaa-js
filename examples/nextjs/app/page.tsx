import { exchangeIdentityForSdkToken } from './liqaa.server';
import LiqaaButton from './LiqaaButton';

/**
 * Next.js App Router (RSC) example.
 *
 * The page is a Server Component — we exchange the visitor's identity for
 * an SDK token on the server, then pass the token to a small Client
 * Component that initializes the SDK in the browser.
 *
 * In a real app, replace the hard-coded user with your authenticated session.
 */
export default async function Home() {
  const sdkToken = await exchangeIdentityForSdkToken({
    email: 'visitor@example.com',
    name: 'Anonymous Visitor',
  });

  return (
    <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 24px', fontFamily: 'system-ui' }}>
      <h1>Talk to support — Next.js (App Router)</h1>
      <p style={{ color: '#64748b', lineHeight: 1.7 }}>
        Server Component renders, signs identity with sk_live_ on the server, passes a 1-hour JWT
        to the client. The client loads the SDK and shows the bubble.
      </p>
      <LiqaaButton sdkToken={sdkToken} />
    </main>
  );
}
