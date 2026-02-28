/**
 * DeployStatus.jsx – Deployment-Ergebnis Anzeige
 *
 * Zeigt nach erfolgreichem Deployment:
 * - Contract-Adresse mit Explorer-Link
 * - TX-Hash mit Explorer-Link
 * - Blocknummer
 * - Token-Details
 */

import React from 'react';
import { getExplorerUrl } from '../services/api.js';

const styles = {
  card: {
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.2rem',
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#22c55e',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '0.5rem 1rem',
    alignItems: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  value: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    wordBreak: 'break-all',
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    wordBreak: 'break-all',
  },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '1rem 0',
  },
  closeBtn: {
    marginTop: '1rem',
    padding: '0.4rem 1rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

function truncate(str, start = 10, end = 8) {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function DeployStatus({ deployment, network, onClose }) {
  if (!deployment) return null;

  const {
    type, name, symbol, decimals, totalSupply,
    initialSupply, granularity,
    contractAddress, txHash, blockNumber, energyUsed,
  } = deployment;

  const isCIP777 = type === 'CIP-777';
  const isCIP721 = type === 'CIP-721';

  const headerText = isCIP777
    ? 'CIP-777 Token erfolgreich deployed!'
    : isCIP721
    ? 'CIP-721 NFT-Collection erfolgreich deployed!'
    : 'Token erfolgreich deployed!';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span>✅</span>
        <span>{headerText}</span>
      </div>

      <div style={styles.grid}>
        <span style={styles.label}>{isCIP721 ? 'Collection' : 'Token'}</span>
        <span style={{ ...styles.value, color: '#e2e8f0', fontFamily: 'inherit', fontSize: '1rem', fontWeight: '600' }}>
          {name} ({symbol})
        </span>

        {isCIP777 ? (
          <>
            <span style={styles.label}>Initial Supply</span>
            <span style={styles.value}>
              {Number(initialSupply).toLocaleString()} {symbol}
            </span>

            <span style={styles.label}>Granularity</span>
            <span style={styles.value}>{granularity}</span>
          </>
        ) : isCIP721 ? (
          <></>
        ) : (
          <>
            <span style={styles.label}>Decimals</span>
            <span style={styles.value}>{decimals}</span>

            <span style={styles.label}>Total Supply</span>
            <span style={styles.value}>
              {Number(totalSupply).toLocaleString()} {symbol}
            </span>
          </>
        )}

        <div style={{ ...styles.divider, gridColumn: '1 / -1' }} />

        {/* Contract */}
        <span style={styles.label}>Contract</span>
        <a
          href={getExplorerUrl(network, 'address', contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          title={contractAddress}
        >
          {contractAddress}
          <span style={{ marginLeft: '0.3rem', fontSize: '0.75rem' }}>↗</span>
        </a>

        {/* TX Hash */}
        <span style={styles.label}>TX Hash</span>
        <a
          href={getExplorerUrl(network, 'tx', txHash)}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          title={txHash}
        >
          {truncate(txHash, 12, 8)}
          <span style={{ marginLeft: '0.3rem', fontSize: '0.75rem' }}>↗</span>
        </a>

        {/* Block */}
        {blockNumber && (
          <>
            <span style={styles.label}>Block</span>
            <span style={styles.value}>#{blockNumber.toLocaleString()}</span>
          </>
        )}

        {/* Energy */}
        {energyUsed && (
          <>
            <span style={styles.label}>Energy Used</span>
            <span style={styles.value}>{Number(energyUsed).toLocaleString()}</span>
          </>
        )}

        <span style={styles.label}>Netzwerk</span>
        <span style={{ ...styles.value, color: network === 'mainnet' ? '#ef4444' : '#3b82f6' }}>
          {network === 'mainnet' ? 'Mainnet' : 'Devín Testnet'}
        </span>
      </div>

      <button style={styles.closeBtn} onClick={onClose}>
        Schließen
      </button>
    </div>
  );
}
