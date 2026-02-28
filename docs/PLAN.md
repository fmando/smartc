# XCB Smart Contract Web Application – Projektplan

**Erstellt:** 2026-02-26
**Ziel:** Weboberfläche zur Erzeugung von Smart Contracts (CIP-20 Token) auf der XCB Blockchain (Testnet → Mainnet)
**Domain:** smartc-dev.scbfan.cc

---

## Systemübersicht

```
Internet
   │
   ▼
smartc-dev.scbfan.cc (Caddy Reverse Proxy)
   │
   ▼ Port 3000
┌─────────────────────────────────────┐
│  Web Application (Node.js/Express)  │
│  ├── Frontend (React SPA)           │
│  └── Backend API (REST)             │
└─────────────────────────────────────┘
   │
   ▼ Port 8545 (HTTP-RPC)
┌──────────────────────────────────────┐
│  gocore Node                         │
│  Testnet: --devin (Network ID: 3)    │
│  Mainnet: --mainnet (Network ID: 1)  │
└──────────────────────────────────────┘
   │
   ▼
XCB Blockchain (Devín Testnet / Mainnet)
Block Explorer: https://xab.blockindex.net/
```

---

## Tech Stack

| Komponente           | Technologie                    | Zweck                              |
|----------------------|--------------------------------|------------------------------------|
| Blockchain Node      | gocore v2.x                    | XCB Node, RPC Interface            |
| Smart Contract Dev   | Foxar (spark, probe, shuttle)  | Kompilierung, Tests, Deployment    |
| Contract Sprache     | Ylem (Solidity-Dialekt für XCB)| CIP-20 und weitere Standards       |
| Backend              | Node.js 20 + Express           | REST API, RPC Kommunikation        |
| Frontend             | React + Vite                   | Weboberfläche, Formulare           |
| Blockchain Library   | corebc.js (npm: corebc)        | XCB Wallet/Contract Interaktion    |
| Webserver/Proxy      | Caddy (extern)                 | HTTPS, Reverse Proxy               |
| OS                   | Debian 12 (Bookworm)           | Container auf Proxmox              |

---

## CIP Token Standards (vorbereitet)

| Standard | Name               | Beschreibung                                      | Phase |
|----------|--------------------|---------------------------------------------------|-------|
| CIP-20   | Token Standard     | Basis-Token (analog ERC-20)                       | 1     |
| CIP-102  | Ownership Mgmt     | Eigentümer-Verwaltung für Contracts               | 2     |
| CIP-103  | WrapperToken       | Wrapping/Unwrapping von CBC20 Tokens              | 2     |
| CIP-104  | PriceFeed Oracle   | Dezentrales Preisorakel                           | 3     |
| CIP-105  | EquivalentToken    | Wertäquivalenz über externe Preisfeeds            | 3     |

---

## Implementierungsphasen

### Phase 1: System Setup
- [ ] Systemabhängigkeiten installieren (git, build-essential, curl)
- [ ] Node.js 20 LTS installieren
- [ ] Go 1.21+ installieren
- [ ] gocore aus Source bauen oder Binary installieren
- [ ] Foxar installieren (spark, probe, shuttle, pilot)

### Phase 2: Blockchain Setup
- [ ] gocore Devín Testnet Node starten
- [ ] Test-Wallet erstellen (Passwörter dokumentieren in wallets.md)
- [ ] HTTP-RPC aktivieren (localhost:8545)
- [ ] Testnet XCB über Faucet beziehen

### Phase 3: Smart Contracts
- [ ] Foxar Projekt initialisieren
- [ ] CIP-20 Token Contract schreiben (Ylem)
- [ ] Unit Tests mit spark
- [ ] Deployment-Script erstellen
- [ ] Contract auf Devín Testnet deployen
- [ ] Im Block Explorer verifizieren: https://xab.blockindex.net/

### Phase 4: Backend API
- [ ] Node.js/Express Projekt initialisieren
- [ ] corebc.js Integration
- [ ] REST Endpoints:
  - `GET  /api/health`         – App/Node Status
  - `POST /api/tokens/deploy`  – CIP-20 Token deployen
  - `GET  /api/tokens`         – Alle deployten Tokens
  - `GET  /api/tokens/:addr`   – Token Details
  - `GET  /api/network`        – Netzwerk Info (testnet/mainnet)
- [ ] Wallet-Management (unlock für Deployment)

### Phase 5: Frontend
- [ ] React + Vite Setup
- [ ] Token-Erstellungsformular (Name, Symbol, Decimals, TotalSupply)
- [ ] Deployment-Status-Anzeige mit TX Hash
- [ ] Deployment-Verlauf (lokale Liste)
- [ ] Netzwerk-Umschalter (Testnet/Mainnet)
- [ ] Vorbereitung für weitere CIP Standards (Tab-basiert)

### Phase 6: Produktion
- [ ] systemd Service für gocore
- [ ] systemd Service für Web App (Port 3000)
- [ ] Logs konfigurieren
- [ ] Mainnet-Konfiguration vorbereiten (externe RPC URL)

---

## Verzeichnisstruktur

```
/root/smartc/
├── docs/
│   ├── PLAN.md          # Dieser Plan
│   ├── SETUP.md         # Schritt-für-Schritt Installationsdoku
│   └── wallets.md       # SENSITIVE: Wallet-Keys und Passwörter
├── contracts/           # Foxar Projekt
│   ├── src/
│   │   ├── CIP20Token.sol
│   │   └── interfaces/ICIP20.sol
│   ├── test/
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foxar.toml
├── backend/             # Node.js API Server
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── .env.example
├── frontend/            # React SPA
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Netzwerk-Konfiguration

| Parameter    | Testnet (Devín)            | Mainnet                    |
|-------------|----------------------------|----------------------------|
| gocore flag | `--devin`                  | (default)                  |
| Network ID  | 3                          | 1                          |
| RPC Lokal   | http://localhost:8545       | http://localhost:8545      |
| RPC Extern  | –                          | Via Umgebungsvariable      |
| Explorer    | https://xab.blockindex.net | https://blockindex.net     |
| IPC Path    | ~/.core/devin/gocore.ipc   | ~/.core/gocore.ipc         |

---

## Mainnet-Vorbereitung

Die Anwendung wird von Anfang an mit einem Konfigurationsschalter (Umgebungsvariable `NETWORK=testnet|mainnet`) gebaut. Im Mainnet-Modus wird:
- Ein externer gocore Client über RPC angesprochen (URL via `RPC_URL` Env-Variable)
- Keine lokale Node gestartet
- Die Konfiguration aus `.env` gelesen

---

## Sicherheitshinweise

- Private Keys **nie** im Frontend oder Git
- `.env` in `.gitignore`
- RPC nur auf localhost binden (kein 0.0.0.0)
- Wallet-Passwörter nur in `docs/wallets.md` (außerhalb Repo)
- Caddy übernimmt HTTPS-Terminierung

---

## Zeitplan (geschätzt)

| Phase         | Aufwand  |
|--------------|----------|
| System Setup  | ~30 min  |
| Blockchain    | ~20 min  |
| Contracts     | ~45 min  |
| Backend       | ~90 min  |
| Frontend      | ~90 min  |
| Konfiguration | ~20 min  |
| **Gesamt**    | **~5h**  |
