#!/bin/bash
# =============================================================
# XCB Smart Contract Web App – Installations-Skript
# =============================================================
# Führt alle Installationsschritte durch:
# 1. Systemabhängigkeiten
# 2. Node.js 20
# 3. gocore
# 4. Foxar
# 5. Backend/Frontend bauen
# 6. systemd Services
#
# Ausführen als root:
#   bash /root/smartc/deploy/install.sh
# =============================================================

set -e  # Bei Fehler abbrechen

SMARTC_DIR="/root/smartc"
LOG_DIR="$SMARTC_DIR/logs"
GOCORE_VERSION="v2.2.2"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "=========================================="
echo "  XCB Smart Contract App – Installation  "
echo "=========================================="
echo ""

# Root-Check
if [ "$EUID" -ne 0 ]; then
  error "Dieses Skript muss als root ausgeführt werden."
fi

# Log-Verzeichnis
mkdir -p "$LOG_DIR"

# =============================================================
# Schritt 1: Systemabhängigkeiten
# =============================================================
info "Schritt 1: Systemabhängigkeiten installieren..."
apt-get update -qq
apt-get install -y -qq \
  git curl build-essential wget ca-certificates \
  2>/dev/null || error "apt-get install fehlgeschlagen"
log "Systemabhängigkeiten installiert"

# =============================================================
# Schritt 2: Node.js 20 LTS
# =============================================================
if command -v node &>/dev/null && node --version | grep -q "v20"; then
  log "Node.js 20 bereits installiert: $(node --version)"
else
  info "Schritt 2: Node.js 20 LTS installieren..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs
  log "Node.js installiert: $(node --version)"
fi

# =============================================================
# Schritt 3: gocore
# =============================================================
if command -v gocore &>/dev/null; then
  log "gocore bereits installiert: $(gocore version 2>&1 | head -1)"
else
  info "Schritt 3: gocore $GOCORE_VERSION installieren..."

  # Versuche Binary-Download
  # Das offizielle Binary benötigt GLIBC 2.38 (Debian 12 hat 2.36) → aus Source bauen
  warn "Baue gocore aus Source (GLIBC-Inkompatibilität des Binaries mit Debian 12)..."

  # Go installieren
  if ! /usr/local/go/bin/go version &>/dev/null; then
    wget -q https://go.dev/dl/go1.21.6.linux-amd64.tar.gz -O /tmp/go.tar.gz
    tar -C /usr/local -xzf /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /root/.bashrc
  fi
  export PATH=$PATH:/usr/local/go/bin

  # gocore v2.2.2 bauen
  git clone --depth 1 --branch v2.2.2 https://github.com/core-coin/go-core.git /tmp/go-core
  cd /tmp/go-core
  make gocore
  cp build/bin/gocore /usr/local/bin/gocore
  cd -
  rm -rf /tmp/go-core

  log "gocore aus Source gebaut: $(/usr/local/bin/gocore version 2>&1 | head -1)"
fi

# =============================================================
# Schritt 4: Foxar (spark, probe, shuttle, pilot)
# =============================================================
if command -v spark &>/dev/null; then
  log "Foxar/spark bereits installiert: $(spark --version 2>&1 | head -1)"
else
  info "Schritt 4: Foxar installieren..."
  curl -L https://up.foxar.dev/ | bash
  # Foxar in PATH aufnehmen
  export PATH="$PATH:$HOME/.foxar/bin"
  echo 'export PATH="$PATH:$HOME/.foxar/bin"' >> /root/.bashrc

  # foxarup ausführen
  if command -v foxarup &>/dev/null; then
    foxarup
    log "Foxar installiert: $(spark --version 2>&1 | head -1)"
  else
    warn "foxarup nicht gefunden – bitte manuell ausführen: foxarup"
  fi
fi

# =============================================================
# Schritt 5: Foxar Projekt initialisieren
# =============================================================
info "Schritt 5: Foxar Projekt initialisieren..."
cd "$SMARTC_DIR/contracts"
if [ ! -d "lib/spark-std" ]; then
  if command -v spark &>/dev/null; then
    spark install spark-std 2>/dev/null || warn "spark-std Install fehlgeschlagen – bitte manuell: cd contracts && spark install spark-std"
    log "spark-std installiert"
  else
    warn "spark nicht verfügbar – bitte nach Foxar-Installation ausführen:"
    warn "  cd $SMARTC_DIR/contracts && spark install spark-std"
  fi
else
  log "spark-std bereits installiert"
fi

# =============================================================
# Schritt 6: Wallet erstellen
# =============================================================
info "Schritt 6: Wallet-Setup..."
if gocore --devin account list 2>/dev/null | grep -q "AB"; then
  WALLET_ADDR=$(gocore --devin account list 2>/dev/null | head -1)
  log "Bestehender Account gefunden: $WALLET_ADDR"
  warn "Wallet-Details in $SMARTC_DIR/docs/wallets.md eintragen!"
else
  warn "Kein Testnet-Wallet gefunden."
  warn "Erstelle neuen Account mit:"
  warn "  gocore --devin account new"
  warn "Dann Adresse in /etc/gocore-devin.conf und .env eintragen."
fi

# =============================================================
# Schritt 7: Backend-Abhängigkeiten installieren
# =============================================================
info "Schritt 7: Backend npm-Abhängigkeiten installieren..."
cd "$SMARTC_DIR/backend"
npm install --silent
log "Backend-Abhängigkeiten installiert"

# .env erstellen falls nicht vorhanden
if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env erstellt aus .env.example – bitte DEPLOYER_ADDRESS und DEPLOYER_PASSWORD eintragen!"
fi

# =============================================================
# Schritt 8: Frontend bauen
# =============================================================
info "Schritt 8: Frontend installieren und bauen..."
cd "$SMARTC_DIR/frontend"
npm install --silent

if [ -f ".env" ] || [ -f "../backend/.env" ]; then
  npm run build 2>/dev/null && log "Frontend gebaut" || warn "Frontend-Build fehlgeschlagen – nach Konfiguration erneut: cd frontend && npm run build"
else
  warn "Frontend wird nach der Konfiguration gebaut – ausführen: cd $SMARTC_DIR/frontend && npm run build"
fi

# =============================================================
# Schritt 9: systemd Services installieren
# =============================================================
info "Schritt 9: systemd Services installieren..."

# gocore Service
cp "$SMARTC_DIR/deploy/gocore-devin.service" /etc/systemd/system/
log "gocore-devin.service installiert"

# gocore Konfigurationsdatei
if [ ! -f /etc/gocore-devin.conf ]; then
  cat > /etc/gocore-devin.conf << 'EOF'
# gocore Devín Testnet Konfiguration
# Wallet-Adresse (AB-Prefix, 44 Zeichen ICAN-Format)
COREBASE_ADDRESS=AB_HIER_EINTRAGEN
EOF
  warn "/etc/gocore-devin.conf erstellt – bitte COREBASE_ADDRESS eintragen!"
fi

# App Service
cp "$SMARTC_DIR/deploy/smartc-app.service" /etc/systemd/system/
log "smartc-app.service installiert"

# systemd neu laden
systemctl daemon-reload
log "systemd daemon reloaded"

# =============================================================
# Abschluss
# =============================================================
echo ""
echo "=========================================="
echo -e "  ${GREEN}Installation abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Noch ausstehende manuelle Schritte:${NC}"
echo ""
echo "1. Wallet erstellen (falls noch nicht vorhanden):"
echo "   gocore --devin account new"
echo ""
echo "2. Konfigurieren:"
echo "   nano /etc/gocore-devin.conf    # COREBASE_ADDRESS eintragen"
echo "   nano $SMARTC_DIR/backend/.env  # DEPLOYER_ADDRESS + DEPLOYER_PASSWORD"
echo "   nano $SMARTC_DIR/docs/wallets.md  # Wallet dokumentieren"
echo ""
echo "3. Smart Contracts bauen:"
echo "   cd $SMARTC_DIR/contracts && spark build"
echo ""
echo "4. Frontend bauen (falls noch nicht gebaut):"
echo "   cd $SMARTC_DIR/frontend && npm run build"
echo ""
echo "5. Services starten:"
echo "   systemctl enable --now gocore-devin"
echo "   systemctl enable --now smartc-app"
echo ""
echo "6. Prüfen:"
echo "   systemctl status gocore-devin"
echo "   systemctl status smartc-app"
echo "   curl http://localhost:3000/api/health"
echo ""
echo -e "App erreichbar unter: ${BLUE}http://localhost:3000${NC}"
echo -e "Oder via Caddy:        ${BLUE}https://smartc-dev.scbfan.cc${NC}"
echo ""
