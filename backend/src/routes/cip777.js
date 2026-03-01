/**
 * cip777.js – CIP-777 Advanced Fungible Token Routen
 *
 * POST /api/cip777/deploy   – CIP-777 Token deployen
 * GET  /api/cip777/:address – Token-Details abrufen
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');
const db = require('../services/db');
const verifier = require('../services/verifier');

// ============================================================
// POST /api/cip777/deploy
// ============================================================
router.post('/deploy', async (req, res) => {
  const { name, symbol, initialSupply, granularity } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Name ist erforderlich' });
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0)
    return res.status(400).json({ error: 'Symbol ist erforderlich' });
  if (symbol.trim().length > 10)
    return res.status(400).json({ error: 'Symbol darf maximal 10 Zeichen haben' });
  if (!initialSupply || isNaN(Number(initialSupply)) || Number(initialSupply) <= 0)
    return res.status(400).json({ error: 'InitialSupply muss eine positive Zahl sein' });

  const gran = Number(granularity) || 1;
  if (gran < 1 || !Number.isInteger(gran))
    return res.status(400).json({ error: 'Granularity muss eine positive ganze Zahl sein' });

  if (!compiler.artifactsExist('CIP777Token')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success)
      return res.status(500).json({ error: 'Contract-Artefakte fehlen.', details: buildResult.error });
  }

  try {
    console.log(`[cip777] Deploye CIP-777: ${name.trim()} (${symbol.trim().toUpperCase()})`);

    const result = await blockchain.deployCIP777({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      initialSupply: initialSupply.toString(),
      granularity: gran,
    });

    const deployment = {
      id: Date.now().toString(),
      type: 'CIP-777',
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      initialSupply: initialSupply.toString(),
      granularity: gran,
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
      const { abi } = blockchain.loadContractArtifacts('CIP777Token');
      db.setAbi(result.contractAddress, abi);
    } catch (e) { /* non-fatal */ }

    verifier.verifyContractAsync(result.contractAddress, 'CIP-777', deployment.network);

    console.log(`[cip777] Deployment erfolgreich: ${result.contractAddress}`);
    res.json({ success: true, message: 'CIP-777 Token erfolgreich deployed!', deployment });
  } catch (err) {
    console.error('[cip777] Deployment-Fehler:', err.message);
    res.status(500).json({ error: 'Deployment fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// GET /api/cip777/:address
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });

  try {
    const local = db.getDeployment(address);

    let onChain = null;
    if (compiler.artifactsExist('CIP777Token')) {
      try { onChain = await blockchain.getCIP777Details(address); }
      catch (err) { console.warn('[cip777] On-Chain Details nicht verfügbar:', err.message); }
    }

    if (!local && !onChain) return res.status(404).json({ error: 'Token nicht gefunden' });

    const network = process.env.NETWORK || 'testnet';
    const explorerBase = network === 'mainnet' ? 'https://blockindex.net' : 'https://xab.blockindex.net';

    res.json({ ...local, ...onChain, explorerUrl: `${explorerBase}/address/${address}` });
  } catch (err) {
    res.status(500).json({ error: 'Details konnten nicht geladen werden', details: err.message });
  }
});

module.exports = router;
