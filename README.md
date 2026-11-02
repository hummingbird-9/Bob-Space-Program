# Bob Space Program (BSP)

A lightweight, KSP-inspired browser spaceflight prototype. The GitHub Pages entry point is `index.html`; it contains its CSS and browser JavaScript inline and has no build step or third-party runtime downloads.

> **Disclaimer:** Many broad game ideas are inspired by Kerbal Space Program. BSP is an independent fan-made prototype, is not an official KSP product, and is not affiliated with or endorsed by the KSP creators.

## Run it

### GitHub Pages

1. Put the contents of this folder at the root of your GitHub repository.
2. Push the files to the `main` branch (or your configured Pages branch).
3. In GitHub, open **Settings → Pages**.
4. Choose **Deploy from a branch**, select the branch and `/ (root)`, then save.
5. Open the Pages URL shown by GitHub. `index.html` is the entry point.

No Node install, bundler, or server is required for single-player mode.

### Local single-player

Open `index.html` in a recent Chrome/Chromium browser, or serve this folder with a static HTTP server. The Bob pilot image is loaded from `png/bob.png`.

### LAN relay

The optional LAN relay is a small Node server. In this folder, run:

```bash
node server/server.js
```

The server prints its local address and LAN port. Other devices on the same trusted local network can open the host computer's address and join the same room. The relay synchronizes basic player presence and mission information; it is not full synchronized vessel physics or matchmaking. Rooms are in-memory and reset when the server stops.

The multiplayer panel in the browser preview/build is a prototype UI; the server relay needs to be wired into the client before live multiplayer synchronization works. A GitHub Pages HTTPS page may also be blocked from calling an ordinary HTTP LAN endpoint by browser mixed-content restrictions.

### Native server package recipes

Build scripts are in `tools/`:

| Target | Build command | Output |
|---|---|---|
| Windows | `powershell -ExecutionPolicy Bypass -File tools/build-server.ps1` | `dist/bsp_server.exe` |
| Linux | `bash tools/build-server.sh` | `dist/bsp_server` |
| Debian / Ubuntu | `bash tools/package-deb.sh` | `.deb` package in `dist/` |
| Arch Linux | `bash tools/package-arch.sh` | `.pkg.tar.zst` package in `dist/` |
| macOS | `bash tools/package-macos.sh` | `.dmg` image in `dist/` |

These are build recipes, not precompiled downloads. Build native artifacts on their target operating systems and install any packaging tools listed by the scripts.

## Current prototype features

- **Vehicle Assembly Building and Spaceplane Hangar:** perspective 3D-style editor, mouse raycasting against the procedural part meshes, selectable parts, and node snapping.
- **Editor tools:** Place (`1`), Offset (`2`), Rotate (`3`), Root (`4`), snap toggle (`C`), right-drag camera orbit, and wheel zoom.
- **Improved procedural models:** rounded tanks, engine bells, capsule and fairing profiles, and airfoil surfaces with upper/lower geometry.
- **Adaptive model detail:** mesh resolution scales with reported device memory and CPU count, with a higher-detail shader-mode setting. It remains a Canvas software renderer, not a GPU-accelerated WebGL engine.
- **Part catalogue:** command capsules, cockpit, probe core, fuel tanks, engines, solid booster, decouplers, separators, fairings, nose cones, wings, elevons, landing gear, parachutes, batteries, solar arrays, reaction wheel, RCS blocks, docking port, heat shield, science lab, relay antenna, and drill.
- **Airfoil inspector:** wing area, camber, incidence, sweep, dihedral, and control deflection controls.
- **Custom parts:** validated JSON part definitions. Custom engine thrust is rejected above the strongest stock BSP engine limit of **9,000 kN**.
- **Flight mode:** simplified SI-unit gravity, atmospheric density, drag, lift approximation, thrust, fuel use, basic steering, landing contact, telemetry and navball.
- **Tracking map:** KSP/Kerbol system body names, Keplerian map positions, compressed and true-scale map options, and a simplified maneuver-node velocity change.
- **Flag editor:** editable colors, patterns, emblems and agency name; PNG upload, local save, and PNG export.
- **Campaign and Bob POV:** randomized rival agency and Human/Kerbal viewpoint options.

## Controls

### Editor

| Key / input | Action |
|---|---|
| `1` / `2` / `3` / `4` | Place / Offset / Rotate / Root |
| `C` | Toggle node snapping |
| `Delete` | Delete selected part and attached descendants |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| Right mouse drag | Orbit camera |
| Mouse wheel | Zoom |

### Flight

| Key | Action |
|---|---|
| `W` / `S` | Pitch |
| `A` / `D` | Yaw |
| `Q` / `E` | Roll |
| `Shift` / `Ctrl` | Increase / decrease throttle |
| `Z` / `X` | Full throttle / cut throttle |
| `Space` | Stage |
| `T` / `R` | Toggle SAS / RCS indicators |
| `M` | Map view |
| `.` / `,` | Increase / decrease timewarp |
| `G` / `B` / `U` | Gear / brakes / lights indicators |
| `F5` / `F9` | Quick save / quick load |
| `C` | Bob POV computer |

Only the listed controls are implemented. They are KSP-inspired, not a complete reproduction of all KSP keybindings.

## Physics and limitations

The planetary data use SI units and real-world analogue values for selected body radii, masses and orbital distances while retaining KSP/Kerbol-system names. The map evaluates Keplerian body positions. Flight integration remains a simplified prototype centered on Kerbin. Full patched-conic sphere-of-influence transitions, N-body perturbations, terrain meshes, detailed landing simulation, docking, complete mission progression, and synchronized multiplayer physics are not implemented. Jool uses a gameplay cloud-deck boundary rather than a solid surface.

Campaign competition is a peaceful survey-beacon race; there are no weapon or missile systems.

## Art assets

- `png/bob.png` — Bob pilot sprite used by the flight HUD. Replace it with a transparent PNG while keeping the same path.
- `assets/images/logo.png` — optional transparent logo/wordmark.
- `assets/images/title-screen.png` — optional 16:9 title artwork.
- `assets/images/loading-screen.png` — optional loading artwork.
- `assets/images/kerbol-skybox.png` — optional 2:1 starfield panorama.
- `assets/images/planets/*.png` — optional planetary surface/cloud textures.
- `assets/images/parts/*.png` — optional part icons and thumbnails.
- `assets/images/flags/*.png` — optional saved flags.

The current build draws most environment and part visuals procedurally; several optional asset paths are documented placeholders and are not automatically loaded.

## Performance notes

- Default mode uses a 2D Canvas software renderer with cached procedural meshes.
- Model detail adapts to the browser's reported device-memory and CPU hints; these hints are approximate and are not a benchmark.
- Turn **SHADER MODE** off on low-powered Chromebooks if frame rate drops.
- The renderer caps device-pixel ratio to limit canvas memory use.

## Repository layout

```text
bob-space-program/
├── index.html             # Current self-contained GitHub Pages entry point
├── png/bob.png            # Bob pilot image
├── js/                    # Modular source/reference files
├── css/                   # Modular stylesheet/reference file
├── server/server.js       # Optional LAN relay source
├── tools/                 # Native server packaging recipes
├── assets/images/         # Optional image assets and notes
├── assets/models/         # Model asset notes
├── package.json
├── LICENSE
└── README.md
```

The `js/` and `css/` files are retained as modular source/reference files from the earlier project layout. The current root `index.html` is the active self-contained build; it does not import those separate files.
