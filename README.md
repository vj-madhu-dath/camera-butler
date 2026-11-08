# Camera Butler
A local-first, responsive photography coaching web app. No build step or package dependencies.

## Run
Requires Node.js 20+:

```sh
cd /Users/madhu/openclaw/Camera_Butler
npm start
```
Open http://localhost:4173 in Safari or Chrome. `npm test` runs guidance tests. PORT and HOST environment variables optionally change the server address; loopback is the default.

## Features
- Live front/rear camera, with explicit user permission and stop control.
- AR-style camera overlays: rule-of-thirds grid, suggested target, selected subject marker.
- Four rule-based shooting presets: portrait, landscape, architecture, food.
- Tap-to-mark framing advice, local brightness sampling, optional device horizon sensor.
- Clean JPEG capture/download, cropped to match the visible viewfinder.
- Illustrated demo mode; no camera required.

## Boundaries
This is a working camera-overlay prototype, not world-anchored WebXR or AI scene understanding. Subject markers are manually selected and do not track when the camera moves; tap again after reframing. It does not measure subject distance or camera elevation. Angle suggestions are educational preset advice, not inferred 3D poses. Brightness is a rough scene average, not a subject-specific exposure meter. Horizon sensors vary by browser and device; verify visually using the grid.

Camera access needs a secure context (localhost or trusted HTTPS). A phone cannot use the Mac's localhost address. To use on a phone, host behind trusted HTTPS reachable from that phone; plain HTTP over a LAN IP will generally block the camera. Enabling a LAN listener or publishing is not done automatically.

Photos and video stay on-device. No API keys, backend uploads, analytics, or paid services. Google Fonts is an optional external stylesheet request; system fonts are the offline fallback. Browser sensor and camera prompts are expected. Real phone camera, motion, and download behavior must be checked on target hardware.
