# Changelog

All notable changes to NODUS are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Changed
- Telemetry default is now **ON** (opt-out), aligned with product design
- Telemetry toggle in dashboard now immediately syncs both `telemetry_enabled` and `settings.telemetryMode` keys
- Full Chat Capture is **Unlimited** in FREE tier
- PRO pricing updated to $4.50/month or $30/year

### Added
- `LICENSE` file (MIT)
- `homepage_url` in `manifest.json`
- `telemetry/cloudflare.worker.js` — Cloudflare Worker saved in repository
- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`

### Fixed
- Telemetry aggregator `prepareForSend()` now runs the full pipeline (aggregate → filter rare → noise) instead of returning raw events
- Telemetry `trackEvent()` always collects locally regardless of ON/OFF mode; only server send is gated
- `addEventToLog()` removed mode check — local log always runs
- Dashboard grid default corrected to 1 column on first open
- Gate ético zoom compensation at 125% browser zoom
- Removed `url_origin`/`url_destination` from telemetry events (sensitive field leak)
- Removed verbose `console.log` from telemetry batch sender
- Removed dead `sendAggregatedBatch()` method from tracker
- Fixed `exportAuditData()` referencing removed `MODES.EXPANDED`
- Fixed `getEndpoint()` referencing removed `ENDPOINTS` object
- Added 4 missing `STORAGE_KEYS` to telemetry config
- Privacy texts updated across gate ético, site, and README to accurately reflect telemetry behavior

---

## [4.171.0] — Pre-launch

### Added
- Auto Capture (PRO) — keyword-based automation per platform
- Encrypted backup — AES-256-GCM, password-protected (PRO)
- Projects — group cards and chains by project
- Chains — link multiple captures into structured workflows
- Inject — send saved content back into any AI conversation
- Full Chat Capture — save entire conversation as a chain
- Dashboard — cards, tags, notes, search, filters
- Quick save — zero-friction capture without modal
- Telemetry system — anonymous, opt-out, local-first
- Support for ChatGPT, Claude, Gemini, Perplexity, Copilot, Grok, DeepSeek
- Multilingual UI — PT, EN, ES
- Popup — mini dashboard with storage stats and telemetry status
- Open Core model — MIT core, proprietary PRO layer

---

*Older history predates this changelog. See git log for full commit history.*
