'use client';
import { useEffect, useState } from 'react';
import { LIQAA, type LIQAAClient } from '@liqaa/js';

export default function LiqaaButton({ sdkToken }: { sdkToken: string }) {
  const [client, setClient] = useState<LIQAAClient | null>(null);

  useEffect(() => {
    LIQAA.init({
      publicKey: process.env.NEXT_PUBLIC_LIQAA_PK!,
      sdkToken,
      accent: '#1d4ed8',
    }).then(setClient).catch(console.error);
  }, [sdkToken]);

  return (
    <button
      onClick={() => client?.startCall('support@yoursite.com', 'Support')}
      disabled={!client}
      style={{
        padding: '14px 22px', background: '#1d4ed8', color: '#fff',
        border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
      }}
    >
      🎥 {client ? 'Talk to Support' : 'Loading SDK…'}
    </button>
  );
}
