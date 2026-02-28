/**
 * tokens.js – Token-Routen
 *
 * POST /api/tokens/deploy  – CIP-20 Token deployen
 * GET  /api/tokens          – Deployment-Historie
 * GET  /api/tokens/:address – Token-Details
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');

const DEPLOYMENTS_FILE =
  process.env.DEPLOYMENTS_FILE || path.join(__dirname, '../../data/deployments.json');

// Deployment-Datei initialisieren
function ensureDeploymentsFile() {
  const dir = path.dirname(DEPLOYMENTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DEPLOYMENTS_FILE)) {
    fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify([], null, 2));
  }
}

function loadDeployments() {
  ensureDeploymentsFile();
  try {
    return JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveDeployment(deployment) {
  ensureDeploymentsFile();
  const deployments = loadDeployments();
  deployments.unshift(deployment); // Neueste zuerst
  fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
}

// ============================================================
// POST /api/tokens/deploy – CIP-20 Token deployen
// ============================================================
router.post('/deploy', async (req, res) => {
  const { name, symbol, decimals, totalSupply } = req.body;

  // Validierung
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Token-Name ist erforderlich' });
  }
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return res.status(400).json({ error: 'Token-Symbol ist erforderlich' });
  }
  if (symbol.trim().length > 10) {
    return res.status(400).json({ error: 'Symbol darf maximal 10 Zeichen haben' });
  }
  if (decimals === undefined || isNaN(Number(decimals)) || Number(decimals) < 0 || Number(decimals) > 18) {
    return res.status(400).json({ error: 'Decimals muss zwischen 0 und 18 liegen' });
  }
  if (!totalSupply || isNaN(Number(totalSupply)) || Number(totalSupply) <= 0) {
    return res.status(400).json({ error: 'TotalSupply muss eine positive Zahl sein' });
  }

  // Prüfen ob Contract-Artefakte vorhanden
  if (!compiler.artifactsExist('CIP20Token')) {
    // Versuche zu kompilieren
    console.log('[tokens] Keine Artefakte – versuche spark build...');
    const buildResult = compiler.buildContracts();
    if (!buildResult.success) {
      return res.status(500).json({
        error: 'Contract-Artefakte fehlen. Bitte "spark build" in /root/smartc/contracts/ ausführen.',
        details: buildResult.error,
      });
    }
  }

  try {
    console.log(`[tokens] Deploye CIP-20: ${name} (${symbol.trim().toUpperCase()})`);

    const result = await blockchain.deployCIP20Token({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
    });

    // Deployment speichern
    const deployment = {
      id: Date.now().toString(),
      type: 'CIP-20',
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
      contractAddress: result.contractAddress,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      deployer: result.deployer,
      energyUsed: result.energyUsed,
      network: process.env.NETWORK || 'testnet',
      timestamp: new Date().toISOString(),
    };

    saveDeployment(deployment);

    console.log(`[tokens] Deployment erfolgreich: ${result.contractAddress}`);

    res.json({
      success: true,
      message: 'Token erfolgreich deployed!',
      deployment,
    });
  } catch (err) {
    console.error('[tokens] Deployment-Fehler:', err.message);
    res.status(500).json({
      error: 'Deployment fehlgeschlagen',
      details: err.message,
    });
  }
});

// ============================================================
// GET /api/tokens – Deployment-Historie
// ============================================================
router.get('/', (req, res) => {
  const deployments = loadDeployments();
  res.json({ deployments, count: deployments.length });
});

// ============================================================
// GET /api/tokens/:address – Token-Details
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  // Basis-Validierung der Adresse
  if (!address || address.length < 40) {
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  }

  try {
    // Zuerst aus lokaler Historie suchen
    const deployments = loadDeployments();
    const localDeployment = deployments.find(
      (d) => d.contractAddress?.toLowerCase() === address.toLowerCase()
    );

    // On-Chain Details laden
    let onChainDetails = null;
    if (compiler.artifactsExist('CIP20Token')) {
      try {
        onChainDetails = await blockchain.getTokenDetails(address);
      } catch (err) {
        console.warn('[tokens] On-Chain Details nicht verfügbar:', err.message);
      }
    }

    if (!localDeployment && !onChainDetails) {
      return res.status(404).json({ error: 'Token nicht gefunden' });
    }

    const network = process.env.NETWORK || 'testnet';
    const explorerBase = network === 'mainnet'
      ? 'https://blockindex.net'
      : 'https://xab.blockindex.net';

    res.json({
      ...localDeployment,
      ...onChainDetails,
      explorerUrl: `${explorerBase}/address/${address}`,
    });
  } catch (err) {
    console.error('[tokens] Details-Fehler:', err.message);
    res.status(500).json({ error: 'Token-Details konnten nicht geladen werden', details: err.message });
  }
});

module.exports = router;
