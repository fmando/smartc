/**
 * wallet.js – Wallet-Verwaltungs-Routen
 *
 * GET  /api/wallet/info              – Deployer-Adresse + XCB-Balance
 * GET  /api/wallet/balances/:address – XCB + Token-Bestände einer Adresse
 * POST /api/wallet/send-xcb          – XCB senden
 * POST /api/wallet/send-token        – CIP-20 / CIP-777 Token senden
 */

const express = require('express');
const router  = express.Router();
const blockchain = require('../services/blockchain');
const db = require('../services/db');
const corebc = require('corebc');

// Holt Token-Bestände einer Adresse via Blockindex API (alle Tokens, nicht nur eigene)
async function fetchTokenBalancesFromBlockindex(address) {
  const cfg = blockchain.getNetworkConfig();
  const url = `${cfg.blockindexApi}/address/${address}?details=tokenBalances`;
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const TYPE_MAP = { CBC20: 'CIP-20', CBC721: 'CIP-721', CBC1155: 'CIP-1155' };

    const tokens = (data.tokens || []).map(t => ({
      type:            TYPE_MAP[t.type] || t.type,
      name:            t.name  || '',
      symbol:          t.symbol || '',
      contractAddress: t.contract,
      decimals:        t.decimals ?? 18,
      balance: t.type === 'CBC721'
        ? (t.ids ? t.ids.length.toString() : '0')
        : corebc.formatUnits(t.balance || '0', t.decimals ?? 18),
    }));

    return { tokens, source: 'blockindex' };
  } catch (err) {
    console.warn('[wallet] Blockindex-API nicht erreichbar, fallback auf DB:', err.message);
    // Fallback: nur eigene Deployments
    const deployments = db.loadDeployments();
    const tokens = await blockchain.getTokenBalancesForAddress(address, deployments);
    return { tokens, source: 'db' };
  }
}

// ============================================================
// GET /api/wallet/info
// ============================================================
router.get('/info', async (req, res) => {
  try {
    const info = await blockchain.getWalletInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Wallet-Info konnte nicht geladen werden', details: err.message });
  }
});

// ============================================================
// GET /api/wallet/balances/:address
// ============================================================
router.get('/balances/:address', async (req, res) => {
  const { address } = req.params;
  if (!address || address.length < 40)
    return res.status(400).json({ error: 'Ungültige Adresse (mind. 40 Zeichen)' });

  try {
    const [xcb, { tokens, source }] = await Promise.all([
      blockchain.getBalance(address),
      fetchTokenBalancesFromBlockindex(address),
    ]);
    res.json({ address, xcb, tokens, tokenSource: source });
  } catch (err) {
    res.status(500).json({ error: 'Guthaben konnte nicht geladen werden', details: err.message });
  }
});

// ============================================================
// POST /api/wallet/send-xcb
// ============================================================
router.post('/send-xcb', async (req, res) => {
  const { to, amount } = req.body;

  if (!to || to.trim().length < 40)
    return res.status(400).json({ error: 'Ungültige Empfänger-Adresse' });
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ error: 'Betrag muss größer als 0 sein' });

  try {
    console.log(`[wallet] Sende ${amount} XCB → ${to.trim().slice(0, 14)}...`);
    const result = await blockchain.sendXCB(to.trim(), amount.toString());
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[wallet] XCB-Transfer Fehler:', err.message);
    res.status(500).json({ error: 'XCB-Transfer fehlgeschlagen', details: err.message });
  }
});

// ============================================================
// POST /api/wallet/send-token
// ============================================================
router.post('/send-token', async (req, res) => {
  const { contractAddress, to, amount, tokenId } = req.body;

  if (!contractAddress || contractAddress.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  if (!to || to.trim().length < 40)
    return res.status(400).json({ error: 'Ungültige Empfänger-Adresse' });

  const token = db.getDeployment(contractAddress);
  const decimals  = token?.decimals  ?? 18;
  const tokenType = token?.type      || 'CIP-20';

  // Typ-spezifische Validierung
  if (tokenType === 'CIP-721') {
    if (tokenId === undefined || tokenId === null || tokenId === '')
      return res.status(400).json({ error: 'Token ID ist erforderlich für CIP-721' });
  } else if (tokenType === 'CIP-1155') {
    if (tokenId === undefined || tokenId === null || tokenId === '')
      return res.status(400).json({ error: 'Token ID ist erforderlich für CIP-1155' });
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ error: 'Betrag muss größer als 0 sein' });
  } else {
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ error: 'Betrag muss größer als 0 sein' });
  }

  try {
    const logAmt = tokenType === 'CIP-721' ? `NFT #${tokenId}` : `${amount} ${token?.symbol || 'Token'}`;
    console.log(`[wallet] Sende ${logAmt} (${tokenType}) → ${to.trim().slice(0, 14)}...`);
    const result = await blockchain.transferToken(contractAddress, to.trim(), amount || '1', decimals, tokenType, tokenId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[wallet] Token-Transfer Fehler:', err.message);
    res.status(500).json({ error: 'Token-Transfer fehlgeschlagen', details: err.message });
  }
});

module.exports = router;
