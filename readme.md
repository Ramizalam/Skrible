# Skrible

Skrible is a real-time multiplayer drawing and guessing game (a Skribbl-like app) implemented with a TypeScript Node.js backend and a React + Vite frontend. It uses WebSockets/Redis for real-time sync between players and supports multiple rounds, turn-based drawing, and in-game chat.

**This README** explains the project structure, how to run the app locally, development notes, and where to look for the main features.

**Contents**
- **Project structure**: high-level layout of backend/frontend and key files
- **Setup & run**: install and run instructions for development
- **Architecture**: brief overview of services, state and real-time flows
- **Key components**: frontend components and backend handlers to inspect/change
- **Troubleshooting**: common issues and debugging tips

**Project Structure**
- `backend/`: TypeScript Node server that handles WebSocket events, game logic, and Redis integration.
	- `src/server.ts` — server entry point
	- `src/handler/GameHandler.ts` — game event handling and coordination
	- `src/services/` — game, round, map, redis and websocket helper services
	- `src/model/` — domain models: `Player`, `Room`, base model
	- `src/utils/Helper.ts` and `word.txt` — helper utilities and word list
- `frontend/`: React + Vite app implementing the game UI
	- `src/App.tsx` — top-level routing and game state toggle
	- `src/components/` — UI components (Canvas, EventNotifier, GameInfoArea, Player, ChatArea, Timer, etc.)
	- `src/service/` — client-side services that call websocket services
	- `src/store/` — MobX stores for `gameStore`, `chatStore`, and `canvasStore`

Getting started (development)

Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

Local setup
1. Clone the repo and open the workspace root (this repo already contains backend and frontend folders).

2. Install dependencies for backend and frontend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Run the backend server
```bash
cd backend
npm run dev   # or the script configured in backend/package.json
```

Run the frontend dev server
```bash
cd frontend
npm run dev
```

Open the app at: http://localhost:5173/ (Vite default)

How it works (high level)
- On the backend, WebSocket events are dispatched and handled by services in `backend/src/services` and `backend/src/handler/GameHandler.ts`.
- Redis is used for any cross-process or pub/sub coordination (see `RedisClient.ts` and `RedisService.ts`).
- The frontend keeps game state in MobX stores (`frontend/src/store/GameStore.ts`) and receives round and chat updates via `RoundServices` and `WebSocketService`.
- When it's a player's turn (drawer), the UI shows a word selection UI; the drawer can pick one of several words and start drawing on the `Canvas` component. Other players see the canvas and guess via the `ChatArea`.

Key files to inspect for common tasks
- Change turn / round logic: `backend/src/handler/GameHandler.ts`, `backend/src/services/RoundService.ts`
- Word list or selection: `frontend/src/components/EventNotifier.tsx`, `frontend/src/service/RoundServices.ts`
- Canvas drawing and sync: `frontend/src/components/Canavas.tsx`, `frontend/src/service/CanvasServices.ts`
- Game state and current player: `frontend/src/store/GameStore.ts`

Common troubleshooting
- If UI shows defaultProps warnings: migrate component `defaultProps` to ES defaults (functional components) or ignore for now — these are warnings from React about an upcoming change.
- If the choose-word modal is visible to everyone: verify `EventNotifier` usage and that `Notification` only renders when `open` is true (the project includes a `Notification` component used by `EventNotifier`).
- If WebSocket events don't arrive: check backend logs, ensure the client connects to the correct WebSocket URL, and ensure Redis (if used) is reachable.

Tips for development
- Use the browser console and the Vite terminal to watch for runtime errors. The frontend dev server will hot-reload on changes.
- Use `console.log` in `RoundService.roundSyncServer` and `GameService.roomSyncServer` to inspect incoming state payloads.
- When modifying the canvas drawing logic, test with two browser windows to confirm drawing sync to other clients.

Contributing
- Open an issue for bugs or feature requests.
- Follow existing coding patterns (TypeScript, MobX stores on the frontend, and service/handler separation on the backend).

Contact
- Repo owner: Ramizalam (see GitHub repository history). For quick questions while developing, add logs and open a PR describing the change.

License
- Check `LICENSE` at the project root for licensing details.
