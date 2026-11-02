# Optional art assets

The game draws its planets, stars, terrain cues, parts, flags and UI directly in Canvas so the default build has no external asset downloads. Add optional artwork here as the project grows:

- `logo.png` — transparent BSP wordmark for the title bar and credits.
- `title-screen.png` — wide title-screen illustration (16:9 recommended).
- `loading-screen.png` — loading/splash background.
- `kerbol-skybox.png` — starfield / Milky Way backdrop; a 2:1 equirectangular image works well.
- `planets/kerbol.png`, `moho.png`, `eve.png`, `kerbin.png`, `mun.png`, `minmus.png`, `gilly.png`, `duna.png`, `ike.png`, `dres.png`, `jool.png`, `laythe.png`, `vall.png`, `tylo.png`, `bop.png`, `pol.png`, `eeloo.png` — optional surface or cloud textures.
- `parts/` — optional icon renders for the part catalogue.
- `flags/` — exported agency flag PNGs.

These are optional. BSP uses procedural low-poly graphics if an image is not supplied.
