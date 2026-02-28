/**
 * TokenList.jsx – Tabelle aller deployten Tokens
 *
 * Zeigt Deployment-Historie mit Links zum Block Explorer.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getDeployments, getExplorerUrl } from '../services/api.js';

const styles = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '600',
  },
  badge: {
    padding: '2px 8px',
    background: 'rgba(37,99,235,0.2)',
    color: '#60a5fa',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '0.6rem 1rem',
    textAlign: 'left',
    color: '#64748b',
    fontSize: '0.78rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.88rem',
    verticalAlign: 'middle',
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontFamily: 'monospace',
    fontSize: '0.82rem',
  },
  networkBadge: (network) => ({
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '600',
    background: network === 'mainnet' ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)',
    color: network === 'mainnet' ? '#f87171' : '#60a5fa',
  }),
  typeBadge: (type) => {
    const map = {
      'CIP-20':   { bg: 'rgba(37,99,235,0.18)',  color: '#60a5fa' },
      'CIP-777':  { bg: 'rgba(124,58,237,0.18)', color: '#a78bfa' },
      'CIP-721':  { bg: 'rgba(34,197,94,0.18)',  color: '#22c55e' },
      'CIP-1155': { bg: 'rgba(234,88,12,0.18)',  color: '#fb923c' },
    };
    const t = map[type] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
    return { padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', background: t.bg, color: t.color };
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    color: '#475569',
  },
  refreshBtn: {
    padding: '0.3rem 0.7rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '5px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};

function truncate(str, len = 12) {
  if (!str || str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}...${str.slice(-8)}`;
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TokenList({ refreshTrigger, onManageClick }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeployments();
      setDeployments(data.deployments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments, refreshTrigger]);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>
          Deployments{' '}
          {!loading && <span style={styles.badge}>{deployments.length}</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onManageClick && (
            <button style={{ ...styles.refreshBtn, color: '#60a5fa', borderColor: 'rgba(37,99,235,0.3)' }} onClick={onManageClick}>
              🗂️ Verwalten
            </button>
          )}
          <button style={styles.refreshBtn} onClick={fetchDeployments}>
            ↻ Aktualisieren
          </button>
        </div>
      </div>

      {loading && (
        <div style={styles.empty}>Lade...</div>
      )}

      {!loading && error && (
        <div style={{ ...styles.empty, color: '#f87171' }}>
          Fehler: {error}
        </div>
      )}

      {!loading && !error && deployments.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
          <div>Noch keine Tokens deployed.</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Nutze das Formular oben um deinen ersten CIP-20 Token zu erstellen.
          </div>
        </div>
      )}

      {!loading && !error && deployments.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Token</th>
                <th style={styles.th}>Typ</th>
                <th style={styles.th}>Contract</th>
                <th style={styles.th}>TX</th>
                <th style={styles.th}>Block</th>
                <th style={styles.th}>Netz</th>
                <th style={styles.th}>Zeit</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id || d.txHash} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600' }}>
                      {d.name || (d.type === 'CIP-1155' ? 'Multi-Token' : '–')}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {d.type === 'CIP-20'   && [d.symbol, d.decimals !== undefined ? `${d.decimals} dec` : null, d.totalSupply ? Number(d.totalSupply).toLocaleString() : null].filter(Boolean).join(' · ')}
                      {d.type === 'CIP-777'  && [d.symbol, d.granularity !== undefined ? `Gran. ${d.granularity}` : null, d.initialSupply ? Number(d.initialSupply).toLocaleString() : null].filter(Boolean).join(' · ')}
                      {d.type === 'CIP-721'  && [d.symbol, 'NFT'].filter(Boolean).join(' · ')}
                      {d.type === 'CIP-1155' && (d.uri ? d.uri : 'keine URI')}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge(d.type)}>{d.type || '–'}</span>
                  </td>
                  <td style={styles.td}>
                    <a
                      href={getExplorerUrl(d.network, 'address', d.contractAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                      title={d.contractAddress}
                    >
                      {truncate(d.contractAddress)}↗
                    </a>
                  </td>
                  <td style={styles.td}>
                    <a
                      href={getExplorerUrl(d.network, 'tx', d.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                      title={d.txHash}
                    >
                      {truncate(d.txHash, 8)}↗
                    </a>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                      #{d.blockNumber?.toLocaleString() || '–'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.networkBadge(d.network)}>
                      {d.network === 'mainnet' ? 'Main' : 'Devín'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDate(d.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
