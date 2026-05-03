import { useEffect, useState } from 'react';
import { LIQAA, type LIQAAClient } from '@liqaa/js';

interface Props {
  /** Pass the SDK token from your server (1-hour JWT). */
  sdkToken: string;
}

/**
 * Minimal React example — initialize the SDK on mount, expose a button
 * that starts a video call with your support email.
 */
export default function App({ sdkToken }: Props) {
  const [client, setClient] = useState<LIQAAClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    LIQAA.init({
      publicKey: 'pk_live_YOUR_KEY',
      sdkToken,
      accent: '#1d4ed8',
    })
      .then((c) => mounted && setClient(c))
      .catch((e) => mounted && setError(e.message));
    return () => { mounted = false; };
  }, [sdkToken]);

  if (error) return <p style={{ color: '#dc2626' }}>SDK error: {error}</p>;

  return (
    <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 24px', fontFamily: 'system-ui' }}>
      <h1>Talk to support — React</h1>
      <p style={{ color: '#64748b' }}>
        Click the button to start a video call. The bubble in the corner is also clickable.
      </p>
      <button
        disabled={!client}
        onClick={() => client?.startCall('support@yoursite.com', 'Support')}
        style={{ padding: '14px 22px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
      >
        🎥 {client ? 'Start video call' : 'Loading SDK…'}
      </button>
    </main>
  );
}
