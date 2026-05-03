/**
 * @liqaa/js — npm-friendly wrapper around the LIQAA SDK.
 *
 * For most sites, the drop-in <script src="https://liqaa.io/sdk.js"> is enough.
 * This package exposes a typed, Promise-based init() for bundler-based stacks
 * (TypeScript projects, React, Vue, Next.js, etc.).
 */

export interface LIQAAInitOptions {
  /** Public key from your console — `pk_live_…` or `pk_test_…`. */
  publicKey: string;
  /** Browser-safe SDK token, exchanged server-side via `/api/public/v1/sdk-token`. */
  sdkToken: string;
  /** Bubble + button color (any hex). Defaults to `#1d4ed8`. */
  accent?: string;
  /** Bubble corner: `'right'` (default) or `'left'`. */
  position?: 'right' | 'left';
  /** Force locale: `'en'` / `'ar'` / `'fr'`. Defaults to page language. */
  locale?: 'en' | 'ar' | 'fr' | 'auto';
  /** Hide the "Powered by LIQAA" footer (Pro plan and above). */
  hideBranding?: boolean;
}

export type LIQAAEvent =
  | 'call.started'
  | 'call.ended'
  | 'call.declined'
  | 'message.sent'
  | 'message.received'
  | 'error';

export interface LIQAAClient {
  /** Open chat panel for a 1:1 conversation. Creates a persistent room if none exists. */
  openConversationWith(email: string, name?: string): Promise<void>;
  /** Start a video call with another user. */
  startCall(email: string, name?: string): Promise<void>;
  /** Programmatic visibility control. */
  show(): void;
  hide(): void;
  toggle(): void;
  /** Subscribe to events. Returns an unsubscribe function. */
  on(event: LIQAAEvent, handler: (payload: unknown) => void): () => void;
  /** Tear down the SDK (useful for SPA navigation). */
  destroy(): void;
}

declare global {
  interface Window {
    LIQAA?: LIQAAClient & {
      __version?: string;
    };
  }
}

const SDK_URL = 'https://liqaa.io/sdk.js';

/**
 * Initialize the LIQAA SDK. Returns a typed client.
 *
 * @example
 * ```ts
 * import { LIQAA } from '@liqaa/js';
 *
 * const liqaa = await LIQAA.init({
 *   publicKey: 'pk_live_…',
 *   sdkToken: token,
 * });
 *
 * await liqaa.startCall('support@yoursite.com', 'Support');
 * ```
 */
async function init(opts: LIQAAInitOptions): Promise<LIQAAClient> {
  if (typeof window === 'undefined') {
    throw new Error('@liqaa/js cannot be initialized in a non-browser environment');
  }

  if (!opts.publicKey || !opts.publicKey.startsWith('pk_')) {
    throw new Error('publicKey must start with pk_live_ or pk_test_');
  }
  if (!opts.sdkToken) {
    throw new Error('sdkToken is required (exchange via /api/public/v1/sdk-token)');
  }

  // If the SDK is already loaded (drop-in script tag in <head>), reuse it.
  if (window.LIQAA) return window.LIQAA;

  await loadScript(SDK_URL, {
    'data-key': opts.publicKey,
    'data-token': opts.sdkToken,
    ...(opts.accent && { 'data-accent': opts.accent }),
    ...(opts.position && { 'data-position': opts.position }),
    ...(opts.locale && { 'data-locale': opts.locale }),
    ...(opts.hideBranding && { 'data-hide-branding': 'true' }),
  });

  if (!window.LIQAA) {
    throw new Error('@liqaa/js loaded but window.LIQAA is undefined');
  }
  return window.LIQAA;
}

function loadScript(src: string, attrs: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load LIQAA SDK from ${src}`));
    document.head.appendChild(script);
  });
}

export const LIQAA = { init };
export default LIQAA;
