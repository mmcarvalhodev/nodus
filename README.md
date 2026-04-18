# NODUS

**Capture, organize and reuse your AI conversations — privately.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-4.176.0-green.svg)](https://github.com/mmcarvalhodev/nodus)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Firefox%20%7C%20Edge%20%7C%20Brave-orange.svg)](https://nodus-ai.app)
[![Status](https://img.shields.io/badge/Status-Live-brightgreen.svg)](https://nodus-ai.app)

> **The only way to prove we're not mining your data: show you the code.**

---

## What is NODUS?

NODUS is a browser extension that captures and organizes your AI conversations across ChatGPT, Claude, Gemini, Perplexity, Copilot, Grok and DeepSeek.

Your captured content stays on your device. No accounts required. Anonymous usage telemetry is collected to improve the product — no conversation content, disableable in settings.

---

## The problem

- AI conversations disappear when sessions end
- Valuable insights get lost across 7 different platforms
- No way to organize, search or reuse what you've captured
- Existing tools are closed-source black boxes

## The solution

- **One-click capture** — save responses with a single button
- **Quick save** — zero-friction capture without modals
- **Dashboard** — organized cards, tags, notes and search
- **Chains** — link multiple captures into structured workflows
- **Projects** — group related ideas into projects
- **Inject** — send saved content back into any AI conversation
- **Local storage** — your captured content never leaves your device

---

## Platforms supported

| Platform | Capture | Inject | Auto Capture |
|---|---|---|---|
| ChatGPT | ✅ | ✅ | PRO |
| Claude | ✅ | ✅ | PRO |
| Gemini | ✅ | ✅ | PRO |
| Perplexity | ✅ | ✅ | PRO |
| Copilot | ✅ | ✅ | PRO |
| Grok | ✅ | ✅ | PRO |
| DeepSeek | ✅ | ✅ | PRO |

---

## FREE vs PRO

### FREE — forever

| Feature | Detail |
|---|---|
| Capture (Save + Quick) | Unlimited |
| Dashboard | Cards, tags, notes, search, filters |
| Queues | 3 — Quick, Default, Q1 |
| Chains | Unlimited |
| Chain export | TXT |
| Full Chat Capture | Unlimited |
| Projects | Up to 3 |
| Inject | ✅ |
| Attachments | ✅ |
| Languages | PT, EN, ES |
| Statistics | With telemetry enabled |

### PRO — $4.50/month or $30/year

Everything in FREE, plus:

| Feature | Detail |
|---|---|
| Queues | 6 — +Q2, Q3, Q4 |
| Chain export | HTML + DOCX (Word) |
| Full Chat Capture | Unlimited |
| Projects | Unlimited |
| Encrypted backup | AES-256-GCM, password-protected |
| Auto Capture | Keyword-based automation per platform |

---

## Privacy

### Local-first architecture

```
AI Platform → NODUS Extension → Your Browser Storage (local only)
```

- All data stored in `chrome.storage.local` and IndexedDB
- No conversation content is sent to external servers
- Telemetry is anonymous and auditable
- Export your data anytime — it's yours

### Telemetry

Telemetry is **on by default** (opt-out) and can be disabled at any time in Settings.

When enabled, it collects anonymous aggregated usage statistics (counts, not content). No PII. No conversation text. No platform data.

You can read the exact implementation in [`telemetry/`](telemetry/).

---

## Open Core

NODUS is Open Core under MIT License.

```
┌──────────────────────────────────────────┐
│           NODUS CORE (Open)              │
│  Capture engines · Dashboard · Chains   │
│  Projects · Storage · Inject · UI       │
│                                          │
│  License: MIT · Forever Open            │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│          NODUS PRO (Proprietary)         │
│  Auto Capture · Advanced exports        │
│  Encrypted backup · License infra       │
│                                          │
│  $4.50/month or $30/year                │
└──────────────────────────────────────────┘
```

**Why Open Core?**
We capture your AI conversations. The only credible way to prove we handle them correctly is to make the code auditable. No trust required — verify it yourself.

**Note:** PRO and core logic are currently co-located in the same files. A clean architectural split into `*.core.js` / `*.pro.js` is planned post-launch.

---

## Repository structure

```
nodus/
├── manifest.json           # Chrome extension manifest (MV3)
├── manifest_firefox.json   # Firefox extension manifest
├── background.js           # Service worker
├── content/
│   ├── content.js          # Main content script
│   └── modules/            # Dashboard, chains, projects, attachments, license
├── engines/                # Platform-specific capture engines (one per AI)
├── ui/                     # Popup HTML/JS/CSS
├── i18n/                   # Translations (PT, EN, ES)
├── telemetry/              # Anonymous telemetry implementation
├── icons/                  # Extension icons
├── releases/               # Packaged builds (Chrome .zip, Firefox .xpi)
└── README_FEATURES.md      # Full feature matrix (FREE vs PRO)
```

---

## Installation

### Chrome Web Store

[Install NODUS for Chrome →](https://chromewebstore.google.com/detail/nodus-ai-idea-capture/egidifchnpakfmagfhbnkbplnidehgjp)

Works on Chrome, Edge, Brave and other Chromium-based browsers.

### Firefox Add-ons

[Install NODUS for Firefox →](https://addons.mozilla.org/firefox/addon/nodus-ai-idea-capture/)

### Manual (Developer Mode)

```bash
git clone https://github.com/mmcarvalhodev/nodus.git
cd nodus
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the cloned folder

---

## Verify the code yourself

```bash
# How NODUS captures from ChatGPT
cat engines/chatgpt.engine.js

# How data is stored locally
cat content/modules/all_modules.js

# What telemetry collects
cat telemetry/telemetry.config.js

# License and feature gates
cat content/modules/license.js
```

---

## License

MIT License — see [LICENSE](LICENSE)

PRO features are proprietary and closed-source. The core capture system, dashboard, chains, projects and UI are MIT.

---

## Links

- **Website:** [nodus-ai.app](https://nodus-ai.app)
- **Chrome Web Store:** [Install for Chrome](https://chromewebstore.google.com/detail/nodus-ai-idea-capture/egidifchnpakfmagfhbnkbplnidehgjp)
- **Firefox Add-ons:** [Install for Firefox](https://addons.mozilla.org/firefox/addon/nodus-ai-idea-capture/)
- **Twitter/X:** [@nodus_app](https://twitter.com/nodus_app)

## Support

- **Email:** mmcarvalho.dev@gmail.com
- **GitHub Issues:** [Report a bug](https://github.com/mmcarvalhodev/nodus/issues)
- **Ko-fi:** [ko-fi.com/mmcarvalho](https://ko-fi.com/mmcarvalho)
- **GitHub Sponsors:** [github.com/sponsors/mmcarvalhodev](https://github.com/sponsors/mmcarvalhodev)

---

*Built with transparency. Funded by fairness.*
