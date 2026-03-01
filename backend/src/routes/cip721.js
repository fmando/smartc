/**
 * cip721.js – CIP-721 Non-Fungible Token Routen
 *
 * POST /api/cip721/deploy        – CIP-721 NFT-Collection deployen
 * POST /api/cip721/:address/mint – NFT minten
 * GET  /api/cip721/:address      – Collection-Details abrufen
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');
const db = require('../services/db');
const verifier = require('../services/verifier');

// ============================================================
// POST /api/cip721/deploy
// ============================================================
router.post('/deploy', async (req, res) => {
  const { name, symbol } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Name ist erforderlich' });
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0)
    return res.status(400).json({ error: 'Symbol ist erforderlich' });
  if (symbol.trim().length > 10)
    return res.status(400).json({ error: 'Symbol darf maximal 10 Zeichen haben' });

  if (!compiler.artifactsExist('CIP721Token')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success)
      return res.status(500).json({ error: 'Contract-Artefakte fehlen.', details: buildResult.error });
  }

  try {
    console.log(`[cip721] Deploye CIP-721: ${name.trim()} (${symbol.trim().toUpperCase()})`);

    const result = await blockchain.deployCIP721({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
    });

    const deployment = {
      id: Date.now().toString(),
      type: 'CIP-721',
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
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
      const { abi } = blockchain.loadContractArtifacts('CIP721Token');
      db.setAbi(result.contractAddress, abi);
    } catch (e) { /* non-fatal */ }

    verifier.verifyContractAsync(result.contractAddress, 'CIP-721', deployment.network);

    console.log(`[cip721] Deployment erfolgreich: ${result.contractAddress}`);
    res.json({ success: true, message: 'CIP-721 NFT-Collection erfolgreich deployed!', deployment });
  } catch (err) {
    console.error('[cip721] Deployment-Fehler:', err.message);
    res.status(500).json({ error: 'Deployment fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// POST /api/cip721/:address/mint
// ============================================================
router.post('/:address/mint', async (req, res) => {
  const { address } = req.params;
  const { to, uri } = req.body;

  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  if (!to || to.trim().length < 40)
    return res.status(400).json({ error: 'Empfänger-Adresse erforderlich (mind. 40 Zeichen)' });

  if (!compiler.artifactsExist('CIP721Token')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success)
      return res.status(500).json({ error: 'Contract-Artefakte fehlen.', details: buildResult.error });
  }

  try {
    console.log(`[cip721] Mint NFT auf ${address} → ${to.trim().slice(0, 12)}...`);
    const result = await blockchain.mintCIP721(address, to.trim(), (uri || '').trim());
    res.json({ success: true, txHash: result.txHash, tokenId: result.tokenId, blockNumber: result.blockNumber });
  } catch (err) {
    console.error('[cip721] Mint-Fehler:', err.message);
    res.status(500).json({ error: 'Mint fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// GET /api/cip721/:address
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });

  try {
    const local = db.getDeployment(address);

    let onChain = null;
    if (compiler.artifactsExist('CIP721Token')) {
      try { onChain = await blockchain.getCIP721Details(address); }
      catch (err) { console.warn('[cip721] On-Chain Details nicht verfügbar:', err.message); }
    }

    if (!local && !onChain) return res.status(404).json({ error: 'Collection nicht gefunden' });

    const network = process.env.NETWORK || 'testnet';
    const explorerBase = network === 'mainnet' ? 'https://blockindex.net' : 'https://xab.blockindex.net';

    res.json({ ...local, ...onChain, explorerUrl: `${explorerBase}/address/${address}` });
  } catch (err) {
    res.status(500).json({ error: 'Details konnten nicht geladen werden', details: err.message });
  }
});

module.exports = router;
