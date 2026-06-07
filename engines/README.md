# NODUS Engines — Open Core boundary

NODUS follows an **Open Core** model. This public repository contains the
client extension (UI, content scripts, telemetry client, and integration
glue) under the MIT license.

The selector **engine** that powers cross-platform capture — the generic
runtime interpreter (`runtime.js`) and the platform selector specifications
(`specs_bundled.json`) — is part of **NODUS Core** and is **not** included
in this repository.

At runtime the extension fetches its selector specifications from the NODUS
backend; the builds published on the Chrome Web Store and Firefox AMO ship
with a minimal bundled spec. This directory is intentionally left without the
engine source.
