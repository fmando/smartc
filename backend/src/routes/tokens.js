/**
 * tokens.js – Token-Routen
 *
 * POST /api/tokens/deploy      – CIP-20 Token deployen
 * GET  /api/tokens              – Deployment-Historie
 * GET  /api/tokens/:address/abi – ABI abrufen
 * GET  /api/tokens/:address     – Token-Details
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');
const db = require('../services/db');
const verifier = require('../services/verifier');

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

    db.saveDeployment(deployment);

    try {
      const { abi } = blockchain.loadContractArtifacts('CIP20Token');
      db.setAbi(result.contractAddress, abi);
    } catch (e) { /* non-fatal */ }

    verifier.verifyContractAsync(result.contractAddress, 'CIP-20', deployment.network);

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
  const deployments = db.loadDeployments();
  res.json({ deployments, count: deployments.length });
});

// ============================================================
// GET /api/tokens/:address/abi – ABI abrufen
// ============================================================
router.get('/:address/abi', (req, res) => {
  const dep = db.getDeployment(req.params.address);
  if (!dep?.abi) return res.status(404).json({ error: 'Kein ABI gespeichert' });
  res.json({ contractAddress: dep.contractAddress, type: dep.type, abi: dep.abi });
});

// ============================================================
// GET /api/tokens/:address – Token-Details
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!address || address.length < 40) {
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  }

  try {
    const localDeployment = db.getDeployment(address);

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
