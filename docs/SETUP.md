# XCB Smart Contract Web App – Setup-Protokoll

**Erstellt:** 2026-02-26
**Ziel:** CIP-20 Token Deployment Web-UI für XCB Blockchain (Devín Testnet)

---

## Schritt 1: Systemabhängigkeiten

```bash
apt-get update && apt-get install -y \
  git curl build-essential wget ca-certificates

# Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Versionen prüfen
node --version   # v20.x.x
npm --version    # 10.x.x
```

**Status:** ☐ Ausstehend
**Ausgabe:**

---

## Schritt 2: gocore installieren

**Hinweis:** Das offizielle Binary benötigt GLIBC 2.38, Debian 12 hat nur 2.36
→ aus Source bauen (Go bereits unter `/usr/local/go/bin/go`).

```bash
# Go 1.21 installieren
wget -q https://go.dev/dl/go1.21.6.linux-amd64.tar.gz -O /tmp/go1.21.6.linux-amd64.tar.gz
tar -C /usr/local -xzf /tmp/go1.21.6.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> /root/.bashrc

# go-core v2.2.2 klonen und bauen (~5 Min.)
git clone --depth 1 --branch v2.2.2 https://github.com/core-coin/go-core.git /tmp/go-core
cd /tmp/go-core && make gocore
cp /tmp/go-core/build/bin/gocore /usr/local/bin/gocore
cd /root/smartc

# Prüfen
/usr/local/bin/gocore version
```

**Status:** ☑ Abgeschlossen
**gocore Version:** Git Commit a091fe2d, Go 1.21.6, amd64

---

## Schritt 3: Foxar installieren

```bash
curl -L https://up.foxar.dev/ | bash
source ~/.bashrc
foxarup

# Prüfen
spark --version
probe --version
```

**Status:** ☑ Abgeschlossen
**spark Version:** spark 0.2.0, probe 0.2.0, shuttle 0.1.0, pilot 0.1.1
**ylem:** 1.1.1 (aus Source gebaut, GLIBC-Problem mit Binary; `cmake .. -DCMAKE_CXX_FLAGS="-Wno-array-bounds -Wno-stringop-overread -Wno-error" && make -j$(nproc) ylem`)
**foxar.toml:** `use_ylem = "/usr/local/bin/ylem"`, `solc_version = "1.1.1"`, pragma `^1.0.0`

---

## Schritt 4: Wallet erstellen

```bash
gocore --devin account new
# Passwort: <HIER EINTRAGEN>
# Adresse:  <AB...>
```

Keystore-Datei: `~/.core/devin/keystore/<UTC--...>`

Alle Details in `wallets.md` dokumentieren.

**Status:** ☑ Abgeschlossen

**Wallet-Adresse (Devín/Testnet AB-Format):** ab921426b1ee851ec7da29ed0a43fb3d860ada5233da
**Wallet-Adresse (Keystore CB-Format):**       cb741426b1ee851ec7da29ed0a43fb3d860ada5233da
**Keystore:** /root/.core/devin/keystore/UTC--2026-02-26T20-39-39.510742809Z--ab921426b1ee851ec7da29ed0a43fb3d860ada5233da

**Hinweis AB/CB-Adressen:**
- gocore speichert Keys im Keystore immer mit CB-Prefix (Mainnet-ICAN-Format)
- Für --devin muss die Keystore-Datei auf AB-Format umbenannt werden (Checksum neu berechnet)
- AB-Checksum = 98 - (mod97 von ICAN-Berechnung mit "ab"-Prefix) = 92 → "92" als Hex-Chars
- CB: cb74... → AB: ab92... (gleicher Schlüssel, unterschiedliche ICAN-Kodierung)

---

## Schritt 5: gocore Devín Node starten

```bash
# Logs-Verzeichnis
mkdir -p /root/smartc/logs

# Node starten
gocore --devin \
  --http --http.addr=127.0.0.1 --http.port=8545 \
  --http.api=xcb,net,web3,personal,miner \
  --http.vhosts=* \
  --keystore=/root/.core/devin/keystore \
  --miner.corebase=<AB-ADRESSE> \
  --unlock=<AB-ADRESSE> \
  --password=/etc/gocore-devin-password.txt \
  --allow-insecure-unlock \
  --mine --miner.threads=1 \
  2>> /root/smartc/logs/gocore.log &

# HINWEIS: Alte Flags --rpc, --rpcaddr, --rpcport, --corebase sind DEPRECATED
# Korrekte aktuelle Flags: --http.*, --miner.corebase, --unlock, --password

# RPC prüfen (warten bis Node synchronisiert)
curl -s http://localhost:8545 \
  -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"xcb_blockNumber","params":[],"id":1}'
```

**Status:** ☑ Abgeschlossen
**Node läuft:** PID 13315, Sync läuft (Devín Testnet ~38% bei ~4.2M Blöcken, ~43 Min. verbleibend)

---

## Schritt 6: systemd Services installieren

```bash
cp /root/smartc/deploy/gocore-devin.service /etc/systemd/system/
cp /root/smartc/deploy/smartc-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable gocore-devin
systemctl enable smartc-app
systemctl start gocore-devin   # startet nach Sync-Abschluss neu (jetzt läuft als BG-Prozess)
systemctl start smartc-app
```

**Status:** ☑ Abgeschlossen
- gocore-devin: enabled (läuft als BG-Prozess PID 13315, wird nach Reboot als Service neu gestartet)
- smartc-app: enabled + active (running), Port 3000

---

## Schritt 7: Foxar Projekt & Smart Contracts

```bash
cd /root/smartc/contracts
spark init --no-git .
spark test
```

Contract deployen:
```bash
spark run script/Deploy.s.sol --rpc-url devin --broadcast
```

**Status:** ☑ Abgeschlossen
**Test-Ergebnis:** 26 Tests bestanden (24 Unit + 2 Fuzz Tests)
**Deploy TX Hash:** ausstehend (nach Sync-Abschluss)

---

## Schritt 8: Backend installieren

```bash
cd /root/smartc/backend
npm install

# .env aus .env.example erstellen
cp .env.example .env
nano .env  # DEPLOYER_ADDRESS und DEPLOYER_PASSWORD eintragen

# Fix: corebc exportiert nicht unter { ethers } – direkt importieren:
# const corebc = require('corebc');
# corebc.JsonRpcProvider, corebc.ContractFactory, etc.
# getNetwork() gibt { networkId: "3" } zurück (nicht chainId)

# Starten (Entwicklung)
node src/index.js
```

**Status:** ☑ Abgeschlossen
- npm install erledigt
- corebc API-Fix in blockchain.js (kein ethers-Wrapper)
- /api/health: connected=true, networkId=3, blockNumber steigt

---

## Schritt 9: Frontend bauen

```bash
cd /root/smartc/frontend
npm install
npm run build
```

**Status:** ☑ Abgeschlossen
- Build in frontend/dist/
- Wird von Express unter http://localhost:3000/ ausgeliefert

---

## Schritt 10: App als Service starten

```bash
systemctl enable smartc-app
systemctl start smartc-app
systemctl status smartc-app

# Prüfen
curl http://localhost:3000/api/health
```

**Status:** ☑ Abgeschlossen
**API Health Response:**
```json
{
  "status": "ok",
  "network": "testnet",
  "node": { "connected": true, "blockNumber": 4177396, "networkId": 3 },
  "mining": { "mining": false, "hashrate": 0 }
}
```
Hinweis: mining=false während Sync läuft (erwartet). Nach Sync-Abschluss startet Mining automatisch.

---

## Verifikation

- [x] `gocore --devin account list` → Wallet-Adresse sichtbar (ab921426...)
- [x] RPC `xcb_blockNumber` steigt (Sync in Fortschritt)
- [x] `spark test` → 26/26 Tests grün
- [ ] Contract auf Testnet deployt → TX in Explorer https://xab.blockindex.net/ (ausstehend: nach Sync)
- [x] Frontend unter http://localhost:3000 erreichbar
- [ ] Token-Formular → Deployment erfolgreich (ausstehend: nach Sync + Mining)
