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
const fs      = require('fs');
const path    = require('path');
const blockchain = require('../services/blockchain');

const DEPLOYMENTS_FILE =
  process.env.DEPLOYMENTS_FILE || path.join(__dirname, '../../data/deployments.json');

function loadDeployments() {
  try {
    if (!fs.existsSync(DEPLOYMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, 'utf8'));
  } catch { return []; }
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
    const deployments = loadDeployments();
    const [xcb, tokens] = await Promise.all([
      blockchain.getBalance(address),
      blockchain.getTokenBalancesForAddress(address, deployments),
    ]);
    res.json({ address, xcb, tokens });
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
  const { contractAddress, to, amount } = req.body;

  if (!contractAddress || contractAddress.length < 40)
    return res.status(400).json({ error: 'Ungültige Contract-Adresse' });
  if (!to || to.trim().length < 40)
    return res.status(400).json({ error: 'Ungültige Empfänger-Adresse' });
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ error: 'Betrag muss größer als 0 sein' });

  const deployments = loadDeployments();
  const token = deployments.find(
    d => d.contractAddress?.toLowerCase() === contractAddress.toLowerCase()
  );
  const decimals  = token?.decimals  ?? 18;
  const tokenType = token?.type      || 'CIP-20';

  try {
    console.log(`[wallet] Sende ${amount} ${token?.symbol || 'Token'} (${tokenType}) → ${to.trim().slice(0, 14)}...`);
    const result = await blockchain.transferToken(contractAddress, to.trim(), amount, decimals, tokenType);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[wallet] Token-Transfer Fehler:', err.message);
    res.status(500).json({ error: 'Token-Transfer fehlgeschlagen', details: err.message });
  }
});

module.exports = router;
