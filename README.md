# Missile Tek — Missile Combat Sandbox v0.1

First playable vertical slice for the browser-first 3D strategy game **Missile Tek**.

## What is implemented

- 3D RTS-style camera
- Two-island test range
- Ballistic missile flight with three trajectory profiles
- Early-warning detection
- Long-range SAM launches and physical homing intercepts
- Short-range point-defense tracer intercepts
- Six-missile saturation attacks
- Decoy penetration package
- Limited SAM magazine / manual reload
- Base health and combat event log
- Babylon.js rendering separated from simple combat state objects so the simulation can later move server-side

## Run it

Requires a recent Node.js installation.

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

Production test:

```bash
npm run build
npm run preview
```

## Immediate next milestones

1. Separate simulation into a fixed-timestep `sim/` module.
2. Add deterministic seeded random numbers.
3. Add missile radar signatures, SAM engagement envelopes, and finite reload cycles.
4. Add terrain-aware radar masking and cruise missiles.
5. Add building placement + power economy.
6. Add research tree.
7. Add Colyseus authoritative server and 1v1 room state.
8. Move fog-of-war knowledge filtering to server.

## Current dependency baseline

- Babylon.js 9.25.0
- Vite 8.2.2

## Browser deployment

The repository includes a GitHub Pages workflow. Production builds use the `/missiletek/` base path.
