# Changelog

All notable changes to `@liqaa/js` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Recording API integration
- Background blur (WebRTC Insertable Streams)
- Live transcripts via Whisper-class models (beta)

## [1.0.0] — 2026-04-30

Initial public release.

### Added
- `LIQAA.init({ publicKey, sdkToken, accent, position })` — primary entry point
- `LIQAA.startCall(email, name?)` — instant 1:1 video call
- `LIQAA.openConversationWith(email, name?)` — text chat panel
- `LIQAA.show()` / `.hide()` / `.toggle()` — bubble visibility control
- `LIQAA.on(event, handler)` — event subscription (`call.started`, `call.ended`, `message.sent`, `error`)
- Drop-in `<script>` flavor at `https://liqaa.io/sdk.js` — 6.4 KB gzipped
- Auto RTL detection for Arabic / Hebrew page languages
- DTLS-SRTP encryption for media, TLS 1.3 for signaling
- WebRTC simulcast (3 layers) — adaptive bitrate
- Persistent rooms via `external_conversation_id`
- HMAC-SHA256 signed webhooks (Stripe-style)

### Security
- Strict separation between `pk_live_*` (browser) and `sk_live_*` (server)
- 1-hour scoped JWT for browser sessions
- Webhook replay protection (5-minute timestamp window)
