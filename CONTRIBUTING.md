# Contributing to NODUS

Thank you for your interest in contributing. NODUS is Open Core — the core extension is MIT licensed and open to contributions.

---

## What can be contributed

The MIT core includes:

- Capture engines (`engines/`)
- Dashboard and UI (`content/modules/`, `ui/`)
- Storage and data layer
- Chains and Projects
- Inject
- Telemetry (anonymous, auditable)
- i18n translations

PRO features (Auto Capture, encrypted backup, advanced exports, license infrastructure) are proprietary and not open for external contributions at this time.

---

## How to contribute

### Bug reports

Open an issue at [github.com/mmcarvalhodev/nodus-core/issues](https://github.com/mmcarvalhodev/nodus-core/issues).

Include:
- Browser and version
- Extension version (visible in popup)
- Steps to reproduce
- What you expected vs what happened
- Console errors if any (F12 → Console)

### Code contributions

1. Fork the repository
2. Create a branch: `git checkout -b fix/your-description`
3. Make your changes
4. Test manually by loading the extension unpacked in Chrome
5. Open a pull request with a clear description

### Translations

Translations live in `i18n/i18n.js`. Currently supported: PT, EN, ES.

To add or fix a translation:
- Find the relevant key in `i18n.js`
- Add or correct the string for your language
- Open a pull request

---

## Development setup

```bash
git clone https://github.com/mmcarvalhodev/nodus-core.git
cd nodus-core
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `nodus-core` folder
5. After editing any file, click the reload icon on the extensions page

No build step required. The extension runs directly from source.

---

## Code style

- Plain JavaScript (no framework, no bundler)
- Manifest V3
- `chrome.storage.local` for all persistent data
- No external dependencies in the core extension
- Comments in PT or EN are both acceptable

---

## Privacy requirement

All contributions must respect the local-first privacy model:

- Captured content must never leave the device
- Any new telemetry event must only collect anonymous counts — no text, no content, no PII
- New features must not introduce external network requests without explicit user action

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
