# Bob Space Program — Update Notes

## VAB attachment and root behavior
- Starts with an empty Vehicle Assembly Building instead of a prebuilt rocket.
- The first command part becomes the craft root; launch requires a command part as root.
- Adds geometry-derived surface attachment markers to make side-mount placement easy to find.
- Side mounts use free surface placement; center top/bottom stack nodes are the only snapping points.
- Center snapping is distance-limited to avoid unintended snaps while placing parts on a side.

## Flight view
- Replaces the flat flight illustration with a perspective chase-camera scene using the assembled craft's part geometry and live vessel coordinates.
- Adds a curved planetary surface/planet mesh, atmospheric sky and limb effects, starfield, sunlight, near-surface terrain and small Kerbin tree silhouettes.
- Adds vertical-speed and atmospheric-percentage telemetry alongside altitude and speed.
- Keeps terrain and planetary mesh resolution modest for lower-powered devices.

## Preserved features
- Existing part catalog, custom parts, wing/airfoil controls, fairing profile builder, PNG flag editor, craft save/load/import/export, staging UI, tracking map, and timewarp UI remain in the standalone browser entry point.
