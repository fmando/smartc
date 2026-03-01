/**
 * api.js – Backend API Service
 *
 * Kommunikation mit dem Express Backend.
 * Basis-URL wird automatisch ermittelt (gleiche Origin).
 */

import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 Minuten für Deployment
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response-Interceptor für einheitliche Fehlerbehandlung
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.details ||
      error.message ||
      'Unbekannter Fehler';
    throw new Error(message);
  }
);

// ============================================================
// Health & Network
// ============================================================

export async function getHealth() {
  return api.get('/health');
}

export async function getNetwork() {
  return api.get('/network');
}

export async function startMining(threads = 1) {
  return api.post('/mining/start', { threads });
}

export async function stopMining() {
  return api.post('/mining/stop');
}

export async function switchNetwork(network) {
  return api.post('/network/switch', { network });
}

export async function getBalance(address) {
  return api.get(`/balance/${address}`);
}

// ============================================================
// Token Deployment
// ============================================================

export async function deployToken({ name, symbol, decimals, totalSupply }) {
  return api.post('/tokens/deploy', { name, symbol, decimals, totalSupply });
}

export async function deployCIP102({ label }) {
  return api.post('/cip102/deploy', { label });
}

export async function deployCIP777({ name, symbol, initialSupply, granularity }) {
  return api.post('/cip777/deploy', { name, symbol, initialSupply, granularity });
}

export async function deployCIP721({ name, symbol }) {
  return api.post('/cip721/deploy', { name, symbol });
}

export async function deployCIP1155({ uri }) {
  return api.post('/cip1155/deploy', { uri });
}

export async function mintCIP721NFT(contractAddress, { to, uri }) {
  return api.post(`/cip721/${contractAddress}/mint`, { to, uri });
}

export async function mintCIP1155Token(contractAddress, { to, id, amount, tokenUri }) {
  return api.post(`/cip1155/${contractAddress}/mint`, { to, id, amount, tokenUri });
}

export async function getDeployments() {
  return api.get('/tokens');
}

export async function getTokenDetails(address) {
  return api.get(`/tokens/${address}`);
}

// ============================================================
// Wallet
// ============================================================

export async function getWalletInfo() {
  return api.get('/wallet/info');
}

export async function getWalletBalances(address) {
  return api.get(`/wallet/balances/${address}`);
}

export async function sendXCB({ to, amount }) {
  return api.post('/wallet/send-xcb', { to, amount });
}

export async function sendToken({ contractAddress, to, amount }) {
  return api.post('/wallet/send-token', { contractAddress, to, amount });
}

// ============================================================
// Verifikation & ABI
// ============================================================

export async function getVerifyStatus(addr) {
  return api.get(`/verify/${addr}`);
}

export async function retriggerVerify(addr) {
  return api.post(`/verify/${addr}`);
}

export async function getTokenAbi(addr) {
  return api.get(`/tokens/${addr}/abi`);
}

// ============================================================
// Explorer URLs
// ============================================================

export function getExplorerUrl(network, type, hash) {
  const base = network === 'mainnet'
    ? 'https://blockindex.net'
    : 'https://xab.blockindex.net';
  return `${base}/${type}/${hash}`;
}
