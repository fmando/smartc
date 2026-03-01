/**
 * cip1155.js – CIP-1155 Multi-Token Routen
 *
 * POST /api/cip1155/deploy        – CIP-1155 Contract deployen
 * POST /api/cip1155/:address/mint – Token minten
 * GET  /api/cip1155/:address      – Contract-Details abrufen
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');
const compiler = require('../services/compiler');
const db = require('../services/db');
const verifier = require('../services/verifier');

// ============================================================
// POST /api/cip1155/deploy
// ============================================================
router.post('/deploy', async (req, res) => {
  const { uri } = req.body;

  if (!compiler.artifactsExist('CIP1155Token')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success)
      return res.status(500).json({ error: 'Contract-Artefakte fehlen.', details: buildResult.error });
  }

  try {
    const baseUri = (uri || '').trim();
    console.log(`[cip1155] Deploye CIP-1155 (uri: "${baseUri || '(leer)'}")`);

    const result = await blockchain.deployCIP1155({ uri: baseUri });

    const deployment = {
      id: Date.now().toString(),
      type: 'CIP-1155',
      uri: baseUri,
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
      const { abi } = blockchain.loadContractArtifacts('CIP1155Token');
      db.setAbi(result.contractAddress, abi);
    } catch (e) { /* non-fatal */ }

    verifier.verifyContractAsync(result.contractAddress, 'CIP-1155', deployment.network);

    console.log(`[cip1155] Deployment erfolgreich: ${result.contractAddress}`);
    res.json({ success: true, message: 'CIP-1155 Multi-Token Contract erfolgreich deployed!', deployment });
  } catch (err) {
    console.error('[cip1155] Deployment-Fehler:', err.message);
    res.status(500).json({ error: 'Deployment fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// POST /api/cip1155/:address/mint
// ============================================================
router.post('/:address/mint', async (req, res) => {
  const { address } = req.params;
  const { to, id, amount, tokenUri } = req.body;

  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  if (!to || to.trim().length < 40)
    return res.status(400).json({ error: 'Empfänger-Adresse erforderlich (mind. 40 Zeichen)' });
  if (id === undefined || id === null || id === '')
    return res.status(400).json({ error: 'Token-ID ist erforderlich' });
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ error: 'Menge muss größer als 0 sein' });

  if (!compiler.artifactsExist('CIP1155Token')) {
    const buildResult = compiler.buildContracts();
    if (!buildResult.success)
      return res.status(500).json({ error: 'Contract-Artefakte fehlen.', details: buildResult.error });
  }

  try {
    console.log(`[cip1155] Mint Token #${id} ×${amount} auf ${address}`);
    const result = await blockchain.mintCIP1155(address, to.trim(), id, amount, (tokenUri || '').trim());
    res.json({ success: true, txHash: result.txHash, blockNumber: result.blockNumber });
  } catch (err) {
    console.error('[cip1155] Mint-Fehler:', err.message);
    res.status(500).json({ error: 'Mint fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// GET /api/cip1155/:address
// ============================================================
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });

  try {
    const local = db.getDeployment(address);

    let onChain = null;
    if (compiler.artifactsExist('CIP1155Token')) {
      try { onChain = await blockchain.getCIP1155Details(address); }
      catch (err) { console.warn('[cip1155] On-Chain Details nicht verfügbar:', err.message); }
    }

    if (!local && !onChain) return res.status(404).json({ error: 'Contract nicht gefunden' });

    const network = process.env.NETWORK || 'testnet';
    const explorerBase = network === 'mainnet' ? 'https://blockindex.net' : 'https://xab.blockindex.net';

    res.json({ ...local, ...onChain, explorerUrl: `${explorerBase}/address/${address}` });
  } catch (err) {
    res.status(500).json({ error: 'Details konnten nicht geladen werden', details: err.message });
  }
});

module.exports = router;
