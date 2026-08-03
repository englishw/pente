# Pente

A polished, fully playable browser-based version of the classic board game Pente. Supports 2-4 players competing individually.

## Features

- **2-4 player support** — all players compete individually, no teams
- **Complete rule implementation** — five-in-a-row, captures, mixed captures, center opening
- **Responsive design** — works on desktop, tablet, and mobile
- **SVG board** — scales perfectly at any resolution
- **Animations** — stone placement, capture removal, win highlighting
- **Sound effects** — procedurally generated via Web Audio API
- **Save/Resume** — game state persists in LocalStorage
- **Undo** — full move history with unlimited undo
- **Accessibility** — keyboard navigation, screen reader support, color-blind mode
- **Settings** — coordinates toggle, sound, animation speed, high contrast, color-blind mode
- **Customizable** — player names and colors
- **Shared game mode** — create/join a multi-device room with a 6-character code via MQTT

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Vitest

Entirely client-side — no backend, no database, no authentication.
Shared mode uses public MQTT brokers over secure WebSockets.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)

### Install & Run

```bash
git clone https://github.com/englishw/pente.git
cd pente
npm install
npm run dev
```

Open http://localhost:5173/pente/ in your browser.

### Run Tests

```bash
npm test
```

### Production Build

```bash
npm run build
npm run preview
```

## Deployment to GitHub Pages

This project deploys automatically via GitHub Actions on every push to `main`.

### Setup

1. Push code to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to **GitHub Actions**
4. The workflow at `.github/workflows/deploy.yml` handles the rest

The site will be available at `https://<username>.github.io/pente/`.

## Architecture

All game logic lives in `src/engine/` as pure TypeScript functions with no React dependencies. The engine is independently testable.

```
src/
├── engine/          # Pure game logic (types, board, validation, captures, victory, engine)
│   └── __tests__/   # 45 unit tests
├── components/      # React UI components
├── context/         # React Context providers (game state, settings, shared MQTT)
├── hooks/           # Custom hooks
└── utils/           # Storage, sound, color utilities
```

## Shared Game Mode

- Host creates a room and gets a 6-character game code.
- Other players join with that code from another browser/device.
- Only name and color are chosen by players; game data is plain JSON (not encrypted).
- Broker connection is automatic with fallback: `broker.emqx.io`, `test.mosquitto.org`, `broker.hivemq.com`.
- Host is authoritative for move validation and broadcasts board state to all players.

## Game Rules

- **Board**: 19×19, play on intersections
- **First move**: Must be placed on the center intersection
- **Captures**: Bracket two opponent stones to remove them (P-O-O-P pattern)
- **Mixed captures**: In 3-4 player games, captured stones can belong to different opponents
- **Win by five-in-a-row**: Five or more consecutive stones in any direction
- **Win by captures**: Accumulate five captured pairs
- **Victory order**: Captures processed first, then both win conditions checked

## License

MIT
