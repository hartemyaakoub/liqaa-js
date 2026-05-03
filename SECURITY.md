# Security Policy

## Reporting a Vulnerability

We take the security of LIQAA seriously. If you believe you've found a security vulnerability in our SDK, API, or infrastructure, please report it responsibly.

**Email:** security@liqaa.io

**PGP key:** available on request.

We commit to:

- Acknowledging your report within **48 hours**
- Providing an initial assessment within **5 business days**
- Keeping you informed of progress until resolution
- Giving you credit (if you wish) once the issue is patched

Please **do not** publicly disclose the issue until we've had a chance to address it.

## Out of scope

- Denial-of-service via volumetric attacks
- Vulnerabilities in third-party dependencies that don't affect LIQAA
- Issues only reproducible in unsupported browsers (IE11, etc.)

## Scope

In scope: any code or service under `*.liqaa.io`, the `@liqaa/*` npm packages, and the LIQAA SDK distributed at `https://liqaa.io/sdk.js`.

## Bounty

We don't currently run a formal bounty program, but we recognize researchers via:

- Public credit on our [security advisories](https://github.com/hartemyaakoub/liqaa-js/security/advisories)
- Swag (LIQAA-branded merchandise)
- Account credits for severe issues

We reserve the right to award monetary bounties at our discretion for high-impact reports.

## Best practices for integrators

When integrating LIQAA into your product:

1. **Never expose `sk_live_*`** to the browser — it must remain server-side only.
2. **Verify webhook signatures** with HMAC + replay window (≤5 min).
3. **Set strict CSP**: `connect-src 'self' wss: https://liqaa.io`.
4. **Rotate API keys** if a key is ever logged or leaked.
5. **Subscribe to** [status.liqaa.io](https://status.liqaa.io) for incident notifications.

For our own posture: we follow CIS controls, encrypt at rest with AES-256, in transit with TLS 1.3, and run automated dependency scans on every commit.
