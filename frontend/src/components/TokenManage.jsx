/**
 * TokenManage.jsx – Token Verwaltungsseite
 *
 * Zeigt alle deployten Contracts als Karten.
 * CIP-721: NFT Mint-Formular
 * CIP-1155: Token Mint-Formular
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getDeployments, getExplorerUrl, mintCIP721NFT, mintCIP1155Token } from '../services/api.js';

const TYPE_CONFIG = {
  'CIP-20':   { color: '#60a5fa', bg: 'rgba(37,99,235,0.15)',   border: 'rgba(37,99,235,0.4)'  },
  'CIP-777':  { color: '#a78bfa', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.4)' },
  'CIP-721':  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)'  },
  'CIP-1155': { color: '#fb923c', bg: 'rgba(234,88,12,0.15)',  border: 'rgba(234,88,12,0.4)'  },
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};

function truncate(str, len = 14) {
  if (!str || str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}...${str.slice(-8)}`;
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function TypeBadge({ type }) {
  const tc = TYPE_CONFIG[type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '700',
      background: tc.bg,
      color: tc.color,
    }}>
      {type}
    </span>
  );
}

function NetBadge({ network }) {
  return (
    <span style={{
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: '600',
      background: network === 'mainnet' ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)',
      color: network === 'mainnet' ? '#f87171' : '#60a5fa',
    }}>
      {network === 'mainnet' ? 'Mainnet' : 'Devín'}
    </span>
  );
}

function MintResult({ txHash, network, tokenId, color }) {
  return (
    <div style={{
      padding: '0.5rem 0.7rem',
      background: 'rgba(34,197,94,0.08)',
      border: '1px solid rgba(34,197,94,0.25)',
      borderRadius: '6px',
      color: '#86efac',
      fontSize: '0.82rem',
      marginTop: '0.5rem',
    }}>
      Geminted! TX:{' '}
      <a
        href={getExplorerUrl(network, 'tx', txHash)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color }}
      >
        {truncate(txHash, 8)}↗
      </a>
      {tokenId && <> · Token-ID: <strong>#{tokenId}</strong></>}
    </div>
  );
}

// ============================================================
// CIP-721 Mint Form
// ============================================================
function MintCIP721Form({ contractAddress, network }) {
  const [to, setTo] = useState('');
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleMint(e) {
    e.preventDefault();
    if (!to.trim()) return setError('Empfänger-Adresse ist erforderlich');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await mintCIP721NFT(contractAddress, { to: to.trim(), uri: uri.trim() });
      setResult(res);
      setTo('');
      setUri('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleMint} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#22c55e', marginBottom: '0.6rem' }}>
        NFT Minten
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          value={to} onChange={e => setTo(e.target.value)}
          placeholder="Empfänger-Adresse (AB... / CB...)"
          style={inputStyle}
        />
        <input
          value={uri} onChange={e => setUri(e.target.value)}
          placeholder="Token-URI (optional, z.B. https://meta.example.com/1.json)"
          style={inputStyle}
        />
      </div>
      {error && (
        <div style={{ padding: '0.5rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}
      {result && <MintResult txHash={result.txHash} network={network} tokenId={result.tokenId} color="#22c55e" />}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.55rem',
          marginTop: '0.6rem',
          background: loading ? '#14532d' : '#16a34a',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          fontSize: '0.88rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Minten...' : '🎨 NFT Minten'}
      </button>
    </form>
  );
}

// ============================================================
// CIP-1155 Mint Form
// ============================================================
function MintCIP1155Form({ contractAddress, network }) {
  const [to, setTo] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('1');
  const [tokenUri, setTokenUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleMint(e) {
    e.preventDefault();
    if (!to.trim()) return setError('Empfänger-Adresse ist erforderlich');
    if (tokenId === '' || Number(tokenId) < 0) return setError('Token-ID ist erforderlich (≥ 0)');
    if (!amount || Number(amount) <= 0) return setError('Menge muss größer als 0 sein');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await mintCIP1155Token(contractAddress, {
        to: to.trim(),
        id: tokenId,
        amount,
        tokenUri: tokenUri.trim(),
      });
      setResult(res);
      setTo('');
      setTokenId('');
      setAmount('1');
      setTokenUri('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleMint} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fb923c', marginBottom: '0.6rem' }}>
        Token Minten
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          value={to} onChange={e => setTo(e.target.value)}
          placeholder="Empfänger-Adresse (AB... / CB...)"
          style={inputStyle}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <input
            value={tokenId} onChange={e => setTokenId(e.target.value)}
            placeholder="Token-ID (z.B. 1)"
            type="number" min="0"
            style={inputStyle}
          />
          <input
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Menge (z.B. 100)"
            type="number" min="1"
            style={inputStyle}
          />
        </div>
        <input
          value={tokenUri} onChange={e => setTokenUri(e.target.value)}
          placeholder="Token-URI (optional)"
          style={inputStyle}
        />
      </div>
      {error && (
        <div style={{ padding: '0.5rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}
      {result && <MintResult txHash={result.txHash} network={network} color="#fb923c" />}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.55rem',
          marginTop: '0.6rem',
          background: loading ? '#7c3313' : '#ea580c',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          fontSize: '0.88rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Minten...' : '🗂️ Token Minten'}
      </button>
    </form>
  );
}

// ============================================================
// Token-Karte
// ============================================================
function TokenCard({ d }) {
  const [mintOpen, setMintOpen] = useState(false);
  const tc = TYPE_CONFIG[d.type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' };
  const canMint = d.type === 'CIP-721' || d.type === 'CIP-1155';

  function getSubtitle() {
    switch (d.type) {
      case 'CIP-20':
        return [d.symbol, d.decimals !== undefined ? `${d.decimals} dec` : null, d.totalSupply ? `Supply: ${Number(d.totalSupply).toLocaleString()}` : null].filter(Boolean).join(' · ');
      case 'CIP-777':
        return [d.symbol, d.granularity !== undefined ? `Granularity: ${d.granularity}` : null, d.initialSupply ? `Supply: ${Number(d.initialSupply).toLocaleString()}` : null].filter(Boolean).join(' · ');
      case 'CIP-721':
        return [d.symbol, 'NFT-Collection'].filter(Boolean).join(' · ');
      case 'CIP-1155':
        return d.uri ? `URI: ${d.uri}` : 'Keine Basis-URI gesetzt';
      default:
        return d.symbol || '';
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderTop: `3px solid ${tc.color}`,
      borderRadius: '12px',
      padding: '1.2rem',
    }}>
      {/* Header: Badges + Mint-Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <TypeBadge type={d.type} />
          <NetBadge network={d.network} />
        </div>
        {canMint && (
          <button
            onClick={() => setMintOpen(!mintOpen)}
            style={{
              padding: '0.3rem 0.75rem',
              background: mintOpen ? 'rgba(255,255,255,0.08)' : tc.bg,
              border: `1px solid ${tc.border}`,
              borderRadius: '5px',
              color: tc.color,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
            }}
          >
            {mintOpen ? '✕ Schließen' : '+ Minten'}
          </button>
        )}
      </div>

      {/* Token-Name */}
      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{ fontWeight: '600', fontSize: '0.98rem' }}>
          {d.name || (d.type === 'CIP-1155' ? 'Multi-Token Contract' : '–')}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
          {getSubtitle()}
        </div>
      </div>

      {/* Contract-Adresse + Explorer-Link */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        padding: '0.45rem 0.7rem',
        fontSize: '0.78rem',
        fontFamily: 'monospace',
        color: '#64748b',
      }}>
        <span title={d.contractAddress}>{truncate(d.contractAddress, 16)}</span>
        <a
          href={getExplorerUrl(d.network, 'address', d.contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: tc.color, textDecoration: 'none', marginLeft: '0.5rem', fontSize: '0.8rem' }}
        >
          Explorer ↗
        </a>
      </div>

      {/* Datum + Block */}
      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
        Block #{d.blockNumber?.toLocaleString() || '–'} · {formatDate(d.timestamp)}
      </div>

      {/* Mint-Formulare */}
      {mintOpen && d.type === 'CIP-721' && (
        <MintCIP721Form contractAddress={d.contractAddress} network={d.network} />
      )}
      {mintOpen && d.type === 'CIP-1155' && (
        <MintCIP1155Form contractAddress={d.contractAddress} network={d.network} />
      )}
    </div>
  );
}

// ============================================================
// Haupt-Komponente
// ============================================================
const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'CIP-20',   label: 'CIP-20'   },
  { id: 'CIP-777',  label: 'CIP-777'  },
  { id: 'CIP-721',  label: 'CIP-721'  },
  { id: 'CIP-1155', label: 'CIP-1155' },
];

export default function TokenManage({ onBack }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

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

  useEffect(() => { fetchDeployments(); }, [fetchDeployments]);

  const filtered = filter === 'all' ? deployments : deployments.filter(d => d.type === filter);

  return (
    <div>
      {/* Seiten-Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.15rem' }}>Token Verwalten</h2>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
            {deployments.length} deployten Contract{deployments.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={fetchDeployments}
            style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            ↻ Aktualisieren
          </button>
          <button
            onClick={onBack}
            style={{ padding: '0.4rem 0.9rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
          >
            ← Deployen
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const tc = f.id !== 'all' ? TYPE_CONFIG[f.id] : null;
          const active = filter === f.id;
          const count = f.id === 'all' ? deployments.length : deployments.filter(d => d.type === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '6px',
                border: active ? `1px solid ${tc?.color || 'rgba(255,255,255,0.3)'}` : '1px solid rgba(255,255,255,0.1)',
                background: active ? (tc?.bg || 'rgba(255,255,255,0.08)') : 'transparent',
                color: active ? (tc?.color || '#e2e8f0') : '#64748b',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: active ? '600' : '400',
              }}
            >
              {f.label}
              <span style={{ marginLeft: '0.35rem', opacity: 0.65 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Inhalt */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>Lade...</div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#f87171' }}>Fehler: {error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <div>{filter === 'all' ? 'Noch keine Contracts deployed.' : `Keine ${filter} Contracts vorhanden.`}</div>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filtered.map(d => <TokenCard key={d.id || d.txHash} d={d} />)}
        </div>
      )}
    </div>
  );
}
