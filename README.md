# Ignition

Launch a saved list of programs with one click. Built for sim racers who have to
open a handful of companion apps every session — but the app itself is generic:
it just launches whatever executables you point it at.

## Example use case: iRacing

A typical iRacing profile might be a list containing:

- Moza Pit House (or your wheel/pedal vendor's control app)
- RaceLab
- Crew Chief
- Trading Paints
- iRacing itself

Click **Launch All** once instead of opening each of these by hand. Programs
already running are detected and skipped rather than relaunched.

You can keep multiple profiles with different sets of programs.

## Download

Grab the latest build for your OS from the
[Releases page](https://github.com/kentayoung/ignition/releases) — `.dmg` for
macOS, installer `.exe` for Windows. See "Known warnings on first run" below
before opening it.

## Features (v1)

- Multiple named profiles, each with its own ordered list of programs
- Add a program via a native file picker, remove, and drag-to-reorder
- **Launch All** spawns every program in the active profile, detached (they
  stay open even if you close the launcher window afterward)
- Skips relaunching anything already running
- Light / dark / system theme
- Optional launch at OS startup, with a configurable delay (Settings menu)

Not in v1 (by design): a system tray icon and staggered launch delays between
programs.

## Development

```bash
npm install
npm run dev        # launches the app with hot reload
npm run typecheck
npm test            # unit tests (vitest)
npm run build       # bundles main/preload/renderer into out/
npm run build:mac   # bundles + packages a .dmg (electron-builder)
npm run build:win   # bundles + packages a Windows installer (electron-builder)
```

`npm run build:win` can be run from macOS without Wine (electron-builder
bundles its own NSIS toolchain), but validate the resulting installer on an
actual Windows machine before sharing it — process spawning, detaching, and
UAC prompts are genuinely platform-specific and not fully verifiable from
macOS alone.

## Releasing

Pushing a tag matching `v*` (e.g. `v0.1.0`) triggers `.github/workflows/build.yml`
to build both platforms and publish them as assets on a new GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Regular pushes to `main` and PRs just build + typecheck (no publish), so the
Releases page only ever gets versions that are deliberately tagged.

## Known warnings on first run

This app is currently shipped **unsigned**. That means:

- **Windows**: SmartScreen will show an "unrecognized publisher" warning.
  Click "More info" → "Run anyway".
- **macOS**: Gatekeeper will refuse to open the app normally. Right-click the
  app → Open, or run `xattr -cr /Applications/Ignition.app` once.

Removing these warnings requires a paid Windows code-signing certificate
(~$100–400/yr) and an Apple Developer Program membership ($99/yr) with
notarization wired into the build — a good follow-up once this is being
distributed more widely, not required to use the app yourself.

## Architecture

- **Electron** (main + preload + renderer), scaffolded with `electron-vite`
- **React + MUI** renderer, with a light/dark theme in `src/renderer/src/theme.ts`
- **electron-store** for persisting profiles (`src/main/store.ts`)
- **ps-list** for cross-platform "is this already running?" detection
- IPC channel names are centralized in `src/shared/types.ts` (`IPC`) and the
  full renderer-facing API surface is defined once in `src/preload/index.ts`
- **Vitest** for unit tests (`src/**/*.test.ts`, colocated with the code they
  cover), focused on `src/main`'s cross-platform logic — process-name
  matching, version comparison, detached-spawn behavior, and icon extraction.
  Runs in CI on both `macos-latest` and `windows-latest`.
