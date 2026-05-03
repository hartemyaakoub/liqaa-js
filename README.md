<div align="center">

# LIQAA JavaScript SDK

**Drop-in video calls and messaging for any website.**

[![npm version](https://img.shields.io/npm/v/@liqaa/js.svg?style=flat-square&color=1d4ed8)](https://www.npmjs.com/package/@liqaa/js)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@liqaa/js?style=flat-square&color=10b981&label=gzipped)](https://bundlephobia.com/package/@liqaa/js)
[![license](https://img.shields.io/badge/license-MIT-475569.svg?style=flat-square)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-liqaa.io-1d4ed8.svg?style=flat-square)](https://liqaa.io/docs)

[Website](https://liqaa.io) · [Docs](https://liqaa.io/docs) · [Console](https://liqaa.io/console) · [Status](https://liqaa.io/status)

</div>

---

## Why LIQAA?

A modern WebRTC stack you can ship today. JavaScript SDK, REST API, signed webhooks. Production-grade primitives — without the integration weeks.

- ⚡ **5-minute integration** — one `<script>` tag and a floating bubble appears
- 🔒 **E2EE-ready** — TLS + DTLS-SRTP, JWT-based per-user tokens
- 🌍 **Global edge** — `<50ms` median signaling latency, 99.99% uptime
- 📦 **6.4 KB gzipped** — async, non-blocking, no dependencies
- 🇩🇿 **RTL-ready** — auto-detects Arabic, French, English (more languages WIP)
- 🔁 **Persistent rooms** — same conversation pair = same room across calls

---

## Install

### Drop-in `<script>` (zero install)

```html
<script
  src="https://liqaa.io/sdk.js"
  data-key="pk_live_YOUR_KEY"
  data-token="<%= sdkToken %>"
  async
></script>
```

### npm

```bash
npm install @liqaa/js
```

```js
import { LIQAA } from '@liqaa/js';

const liqaa = await LIQAA.init({
  publicKey: 'pk_live_YOUR_KEY',
  sdkToken:  'tkc_…', // exchanged server-side
  accent:    '#1d4ed8',
});

document.querySelector('#call-btn').addEventListener('click', () => {
  liqaa.startCall('support@yoursite.com', 'Support');
});
```

### React

```bash
npm install @liqaa/react @liqaa/js
```

```tsx
import { LIQAAProvider, LIQAACallButton } from '@liqaa/react';

export default function App({ sdkToken }) {
  return (
    <LIQAAProvider publicKey="pk_live_…" sdkToken={sdkToken}>
      <LIQAACallButton email="support@yoursite.com">
        Talk to Support
      </LIQAACallButton>
    </LIQAAProvider>
  );
}
```

---

## Server-side: exchange identity for an SDK token

The browser must never see `sk_live_`. On every page render, your server signs the visitor's identity and exchanges it for a 1-hour browser-safe JWT.

```js
// Node.js
const crypto = require('crypto');

const identity = Buffer.from(JSON.stringify({
  email: user.email,
  name:  user.name,
  ts:    Math.floor(Date.now() / 1000),
})).toString('base64');

const signature = crypto
  .createHmac('sha256', process.env.LIQAA_SK)
  .update(identity)
  .digest('hex');

const r = await fetch('https://liqaa.io/api/public/v1/sdk-token', {
  method:  'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LIQAA_SK}`,
    'Content-Type':  'application/json',
  },
  body: JSON.stringify({
    public_key:      process.env.LIQAA_PK,
    identity_base64: identity,
    signature,
  }),
});

const { sdk_token } = await r.json();
// → pass sdk_token to the browser
```

Server-side examples for **PHP, Python, Go, Ruby, Laravel, Django** — see [`/examples`](./examples).

---

## API surface

| Method                                          | Description                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `LIQAA.init(opts)`                              | Initialize the SDK. Returns a `LIQAAClient`.                               |
| `LIQAA.startCall(email, name?)`                 | Start a video call with another user. Persistent room per conversation.    |
| `LIQAA.openConversationWith(email, name?)`      | Open a chat (text) panel.                                                  |
| `LIQAA.show()` / `.hide()` / `.toggle()`        | Control bubble visibility.                                                 |
| `LIQAA.on(event, handler)`                      | Listen to events: `call.started`, `call.ended`, `message.sent`, `error`.   |
| `LIQAA.destroy()`                               | Tear down the SDK (useful for SPA navigation).                             |

### Script-tag attributes

| Attribute        | Default       | Description                                          |
| ---------------- | ------------- | ---------------------------------------------------- |
| `data-key`       | —             | **Required.** Your `pk_live_…`                       |
| `data-token`     | —             | **Required.** Browser-safe SDK JWT.                  |
| `data-accent`    | `#1d4ed8`     | Bubble + button color (any hex).                     |
| `data-position`  | `right`       | `right` or `left`.                                   |
| `data-locale`    | `auto`        | `en` / `ar` / `fr` — auto-detects page lang.         |
| `async`          | recommended   | Non-blocking load.                                   |

Full reference at [**liqaa.io/docs**](https://liqaa.io/docs).

---

## Examples

| Stack                | Folder                                              |
| -------------------- | --------------------------------------------------- |
| Vanilla HTML         | [`examples/vanilla`](./examples/vanilla)             |
| React + Vite         | [`examples/react`](./examples/react)                 |
| Next.js (App Router) | [`examples/nextjs`](./examples/nextjs)               |
| Vue 3                | [`examples/vue`](./examples/vue)                     |
| Node.js (server)     | [`examples/node-server`](./examples/node-server)     |
| PHP / Laravel        | [`examples/php-laravel`](./examples/php-laravel)     |

---

## Architecture

```
┌──────────┐    HTTPS+JWT     ┌──────────────┐    WebRTC+WSS    ┌──────────┐
│ Browser  │ ──────────────▶  │ LIQAA Cloud  │  ──────────────▶ │ LiveKit  │
│ + SDK    │                  │ (signaling,  │                  │ SFU mesh │
│          │ ◀──────────────  │  webhooks,   │  ◀────────────── │ (global) │
└──────────┘   events/state    │  REST API)   │   media (DTLS)   └──────────┘
                              └──────────────┘
```

The SDK speaks HTTPS + JWT to LIQAA Cloud. Media negotiates WebRTC directly with our LiveKit SFU mesh — we never touch the bytes.

See [liqaa.io/learn](https://liqaa.io/learn) for the full architectural deep-dive.

---

## Browser support

Full support: Chrome 88+, Firefox 78+, Safari 14+, Edge 88+, Safari iOS 14.5+, Chrome Android 88+.

WebRTC is required (so anything modern). For users on legacy browsers, the SDK gracefully degrades to a "your browser doesn't support video calls" message.

---

## Security

We follow Stripe's separation of concerns: **`pk_live_*`** is safe in the browser, **`sk_live_*`** is server-only. The SDK refuses any browser request that uses `sk_*`.

Webhooks are signed with HMAC-SHA256 over `t=<timestamp>.<payload>`. Reject replays older than 5 minutes; verify with constant-time comparison.

For vulnerability disclosure see [`SECURITY.md`](./SECURITY.md) or email **security@liqaa.io**.

---

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev loop. Issues and feature requests are tracked here on GitHub.

---

## License

[MIT](./LICENSE) © TKAWEN — LIQAA Cloud. Built in 🇩🇿 Algeria, for the world.
