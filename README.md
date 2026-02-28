# XCB Smart Contract Web App

Web-Oberfläche zur Erzeugung und Verwaltung von Smart Contracts auf der **Core Coin (XCB) Blockchain**.

**Domain:** smartc-dev.scbfan.cc
**Netzwerk:** Devín Testnet (Network ID: 3) → später Mainnet

---

## Features

- CIP-20 Token Deployment via Browser-Formular
- Echtzeit-Node-Status (Blocknummer, Mining, Netzwerk)
- TX-Hash und Contract-Adresse mit Explorer-Links
- Deployment-Historie
- Vorbereitung für CIP-102, CIP-103, CIP-104, CIP-105

## Tech Stack

| Komponente      | Technologie              |
|-----------------|--------------------------|
| Blockchain Node | gocore v2.2.2            |
| Contracts       | Foxar (spark, probe)     |
| Contract Sprache| Ylem (Solidity-Dialekt)  |
| Backend         | Node.js 20 + Express     |
| Frontend        | React + Vite             |
| Blockchain Lib  | corebc.js                |
| Proxy           | Caddy (HTTPS)            |

## Quick Start

Für vollständige Installationsanleitung: [`docs/SETUP.md`](docs/SETUP.md)

```bash
# 1. Backend
cd backend && npm install && cp .env.example .env
# .env anpassen (DEPLOYER_ADDRESS, DEPLOYER_PASSWORD)

# 2. Frontend bauen
cd frontend && npm install && npm run build

# 3. App starten
cd backend && node src/index.js
# → http://localhost:3000
```

## Projektstruktur

```
/root/smartc/
├── docs/           # Dokumentation (SETUP.md, PLAN.md, wallets.md)
├── contracts/      # Foxar Projekt (Smart Contracts)
│   ├── src/        # CIP20Token.sol, interfaces/
│   ├── test/       # Unit Tests
│   └── script/     # Deployment Scripts
├── backend/        # Node.js Express API
│   └── src/        # index.js, routes/, services/
├── frontend/       # React + Vite SPA
│   └── src/        # components/, services/
├── deploy/         # systemd Service-Dateien
└── logs/           # Logdateien (gitignore'd)
```

## API Endpoints

| Method | Endpoint                  | Beschreibung                    |
|--------|---------------------------|---------------------------------|
| GET    | `/api/health`             | Node-Status, Blocknummer        |
| GET    | `/api/network`            | Netzwerk-Info                   |
| POST   | `/api/tokens/deploy`      | CIP-20 Token deployen           |
| GET    | `/api/tokens`             | Deployment-Historie             |
| GET    | `/api/tokens/:address`    | Token-Details                   |
| GET    | `/api/balance/:address`   | XCB-Balance                     |

## Explorer

- Testnet: https://xab.blockindex.net/
- Mainnet: https://blockindex.net/

## Sicherheit

- Private Keys im gocore keystore (`~/.core/devin/keystore/`)
- `.env` und `docs/wallets.md` niemals in Git
- RPC nur auf localhost (127.0.0.1:8545)
- Caddy übernimmt HTTPS/TLS
