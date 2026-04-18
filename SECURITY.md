# Security Policy

## Scope

This policy covers the NODUS browser extension — the core capture system, dashboard, telemetry, and all code in this repository.

---

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately by email:

**mmcarvalho.dev@gmail.com**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Browser and extension version

You will receive a response within 5 business days. If the issue is confirmed, a fix will be prioritized and you will be credited in the changelog (unless you prefer to remain anonymous).

---

## What we consider a vulnerability

- Any mechanism that could cause captured conversation content to leave the user's device without explicit user action
- Any bypass of the telemetry opt-out that causes content (not just counts) to be sent externally
- Any code execution vulnerability in the extension context
- Any storage access that could expose user data to third parties
- Any XSS or injection vector introduced through the extension UI

---

## What we do not consider a vulnerability

- Telemetry sending anonymous aggregated usage counts when telemetry is ON (this is by design and disclosed)
- The encrypted backup feature sending a file to the user's local filesystem
- A website being able to detect that NODUS is installed (this is a general browser extension limitation)

---

## Privacy model

NODUS is designed local-first:

```
AI Platform → NODUS Extension → Your Browser Storage (local only)
```

- Captured content is stored in `chrome.storage.local` and IndexedDB
- No conversation content is ever transmitted to external servers
- Telemetry (when ON) sends only anonymous aggregated counts — no text, no content, no PII
- The telemetry implementation is fully auditable in `telemetry/`

---

## Supported versions

| Version | Supported |
|---|---|
| Latest (master) | Yes |
| Older releases | No |

We only maintain the latest version. Security fixes are applied to master and released as the next extension update.
