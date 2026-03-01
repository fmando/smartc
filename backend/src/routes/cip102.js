/**
 * cip102.js – CIP-102 Ownership Management Routen
 *
 * POST /api/cip102/deploy   – CIP-102 Ownable Contract deployen
 * GET  /api/cip102/:address – Contract-Details abrufen
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');
const db = require('../services/db');
const verifier = require('../services/verifier');

// ============================================================
// POST /api/cip102/deploy
// ============================================================
router.post('/deploy', async (req, res) => {
  const { label } = req.body;

  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return res.status(400).json({ error: 'Label ist erforderlich' });
  }
  if (label.trim().length > 64) {
    return res.status(400).json({ error: 'Label darf maximal 64 Zeichen haben' });
  }

  if (!compiler.artifactsExist('CIP102Ownable')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success) {
      return res.status(500).json({
        error: 'Contract-Artefakte fehlen. Bitte "spark build" ausführen.',
        details: buildResult.error,
      });
    }
  }

  try {
    console.log(`[cip102] Deploye CIP-102: ${label.trim()}`);

    const result = await blockchain.deployCIP102({ label: label.trim() });

    const deployment = {
      id: Date.now().toString(),
      type: 'CIP-102',
      label: label.trim(),
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
      const { abi } = blockchain.loadContractArtifacts('CIP102Ownable');
      db.setAbi(result.contractAddress, abi);
    } catch (e) { /* non-fatal */ }

    verifier.verifyContractAsync(result.contractAddress, 'CIP-102', deployment.network);

    console.log(`[cip102] Deployment erfolgreich: ${result.contractAddress}`);

    res.json({ success: true, message: 'CIP-102 Contract erfolgreich deployed!', deployment });
  } catch (err) {
    console.error('[cip102] Deployment-Fehler:', err.message);
    res.status(500).json({ error: 'Deployment fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// GET /api/cip102/:address – Contract-Details
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!address || address.length < 40) {
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  }

  try {
    const local = db.getDeployment(address);

    let onChain = null;
    if (compiler.artifactsExist('CIP102Ownable')) {
      try {
        onChain = await blockchain.getCIP102Details(address);
      } catch (err) {
        console.warn('[cip102] On-Chain Details nicht verfügbar:', err.message);
      }
    }

    if (!local && !onChain) {
      return res.status(404).json({ error: 'Contract nicht gefunden' });
    }

    const network = process.env.NETWORK || 'testnet';
    const explorerBase = network === 'mainnet'
      ? 'https://blockindex.net'
      : 'https://xab.blockindex.net';

    res.json({
      ...local,
      ...onChain,
      explorerUrl: `${explorerBase}/address/${address}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Details konnten nicht geladen werden', details: err.message });
  }
});

module.exports = router;
