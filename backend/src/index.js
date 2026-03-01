/**
 * index.js – XCB Smart Contract Web App
 *
 * Express Server:
 * - REST API für Smart Contract Deployment
 * - Statisches Frontend (React SPA)
 *
 * Läuft auf Port 3000 → Caddy Reverse Proxy → smartc-dev.scbfan.cc
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const blockchain = require('./services/blockchain');
const compiler = require('./services/compiler');
const db = require('./services/db');
const verifier = require('./services/verifier');
const tokensRouter = require('./routes/tokens');
const cip102Router = require('./routes/cip102');
const cip777Router = require('./routes/cip777');
const cip721Router = require('./routes/cip721');
const cip1155Router = require('./routes/cip1155');
const walletRouter = require('./routes/wallet');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request-Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================
// API Routes
// ============================================================

// Health Check
app.get('/api/health', async (req, res) => {
  const [nodeStatus, miningStatus, syncStatus] = await Promise.all([
    blockchain.getNodeStatus(),
    blockchain.getMiningStatus(),
    blockchain.getSyncStatus(),
  ]);

  const explorerBase = blockchain.getNetworkConfig().explorer;

  let readyForDeploy = true;
  let deployerBalance = null;

  if (blockchain.network === 'mainnet') {
    try {
      const walletInfo = await blockchain.getWalletInfo();
      deployerBalance = walletInfo.balance ?? '0';
      readyForDeploy = parseFloat(deployerBalance) >= 1;
    } catch {
      readyForDeploy = false;
      deployerBalance = '0';
    }
  }

  res.json({
    status: 'ok',
    app: 'XCB Smart Contract Web App',
    version: '1.0.0',
    network: blockchain.network,
    node: nodeStatus,
    mining: miningStatus,
    sync: syncStatus,
    explorer: explorerBase,
    readyForDeploy,
    deployerBalance,
    timestamp: new Date().toISOString(),
  });
});

// Netzwerk-Info
app.get('/api/network', async (req, res) => {
  const nodeStatus = await blockchain.getNodeStatus();
  const miningStatus = await blockchain.getMiningStatus();

  res.json({
    current: blockchain.network,
    config: blockchain.getNetworkConfig(),
    available: blockchain.getAvailableNetworks(),
    node: nodeStatus,
    mining: miningStatus,
  });
});

// Mining-Steuerung
app.post('/api/mining/start', async (req, res) => {
  const threads = Math.min(Math.max(Number(req.body?.threads) || 1, 1), 12);
  try {
    await blockchain.startMining(threads);
    console.log(`[api] Mining gestartet (${threads} Thread(s))`);
    res.json({ success: true, mining: true, threads });
  } catch (err) {
    res.status(500).json({ error: 'Mining konnte nicht gestartet werden', details: err.message });
  }
});

app.post('/api/mining/stop', async (req, res) => {
  try {
    await blockchain.stopMining();
    console.log('[api] Mining gestoppt');
    res.json({ success: true, mining: false });
  } catch (err) {
    res.status(500).json({ error: 'Mining konnte nicht gestoppt werden', details: err.message });
  }
});

// Netzwerk-Wechsel
app.post('/api/network/switch', (req, res) => {
  const { network } = req.body;

  if (!network || !['testnet', 'mainnet'].includes(network)) {
    return res.status(400).json({ error: 'Ungültiges Netzwerk. Erlaubt: testnet, mainnet' });
  }

  if (network === blockchain.network) {
    return res.json({ success: true, network, message: `Bereits auf ${network}` });
  }

  try {
    blockchain.switchNetwork(network);
    console.log(`[api] Netzwerk gewechselt auf: ${network}`);
    res.json({ success: true, network, message: `Erfolgreich auf ${network} umgeschaltet` });
  } catch (err) {
    res.status(500).json({ error: 'Netzwerk-Wechsel fehlgeschlagen', details: err.message });
  }
});

// XCB Balance
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;

  if (!address || address.length < 40) {
    return res.status(400).json({ error: 'Ungültige Adresse' });
  }

  try {
    const balance = await blockchain.getBalance(address);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: 'Balance konnte nicht geladen werden', details: err.message });
  }
});

// Compiler-Info
app.get('/api/compiler', (req, res) => {
  res.json({
    foxarAvailable: compiler.isFoxarAvailable(),
    contracts: compiler.getContractInfo(),
  });
});

// Contract-Tests ausführen (nur Testnet)
if (blockchain.network === 'testnet') {
  app.post('/api/compiler/test', (req, res) => {
    const result = compiler.runTests();
    res.json(result);
  });
}

// Verifikations-Endpoints
app.get('/api/verify/:address', (req, res) => {
  const dep = db.getDeployment(req.params.address);
  if (!dep) return res.status(404).json({ error: 'Contract nicht gefunden' });
  const statusMap = { 0: 'pending', 1: 'verified', 2: 'failed' };
  res.json({
    contractAddress: dep.contractAddress,
    type: dep.type,
    network: dep.network,
    verified: dep.verified,
    status: statusMap[dep.verified] || 'pending',
    verifiedAt: dep.verifiedAt ?? null,
    verifyError: dep.verifyError ?? null,
  });
});

app.post('/api/verify/:address', (req, res) => {
  const triggered = verifier.retriggerVerification(req.params.address);
  if (!triggered) return res.status(404).json({ error: 'Contract nicht gefunden' });
  res.json({ success: true, message: 'Verifikation neu gestartet', status: 'pending' });
});

// Token-Routen
app.use('/api/tokens', tokensRouter);
app.use('/api/cip102', cip102Router);
app.use('/api/cip777', cip777Router);
app.use('/api/cip721', cip721Router);
app.use('/api/cip1155', cip1155Router);
app.use('/api/wallet', walletRouter);

// 404 für unbekannte API-Routen
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API-Endpoint nicht gefunden: ${req.path}` });
});

// ============================================================
// Frontend (React SPA)
// ============================================================
const frontendDist = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA: alle nicht-API Routen → index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Fallback wenn Frontend noch nicht gebaut
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>XCB Smart Contract App</title>
        <style>
          body { font-family: monospace; max-width: 600px; margin: 4rem auto; padding: 1rem; }
          pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; }
          .ok { color: green; } .err { color: red; }
        </style>
      </head>
      <body>
        <h1>XCB Smart Contract App</h1>
        <p>Backend läuft. Frontend noch nicht gebaut.</p>
        <pre>cd /root/smartc/frontend && npm install && npm run build</pre>
        <hr>
        <p>API: <a href="/api/health">/api/health</a></p>
      </body>
      </html>
    `);
  });
}

// ============================================================
// Error Handler
// ============================================================
app.use((err, req, res, _next) => {
  console.error('[error]', err.stack);
  res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
});

// ============================================================
// Server starten
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('  XCB Smart Contract Web App');
  console.log('='.repeat(50));
  console.log(`  Port:    ${PORT}`);
  console.log(`  Network: ${blockchain.network}`);
  console.log(`  RPC:     ${process.env.RPC_URL || 'http://127.0.0.1:8545'}`);
  console.log(`  API:     http://localhost:${PORT}/api/health`);
  console.log('='.repeat(50));
});

module.exports = app;
