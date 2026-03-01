/**
 * TokenInfoPage.jsx – Token-Galerie
 *
 * Zeigt alle deployed Tokens beider Netzwerke als Card-Grid.
 * Filter nach Netz und CIP-Typ. Klick öffnet Detail-Modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getDeployments, getTokenDetails, getExplorerUrl } from '../services/api.js';

// ── Farben ────────────────────────────────────────
const TYPE_COLOR = {
  'CIP-20':   { fg: '#60a5fa', bg: 'rgba(37,99,235,0.14)'  },
  'CIP-777':  { fg: '#a78bfa', bg: 'rgba(124,58,237,0.14)' },
  'CIP-721':  { fg: '#22c55e', bg: 'rgba(34,197,94,0.14)'  },
  'CIP-1155': { fg: '#fb923c', bg: 'rgba(234,88,12,0.14)'  },
  'CIP-102':  { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)'},
};
const NET_COLOR = {
  mainnet: { fg: '#f87171', bg: 'rgba(220,38,38,0.14)' },
  testnet: { fg: '#60a5fa', bg: 'rgba(37,99,235,0.12)' },
};

function Badge({ label, fg, bg }) {
  return (
    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', background: bg, color: fg }}>
      {label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSupply(dep) {
  const raw = dep.totalSupply ?? dep.initialSupply;
  if (!raw) return null;
  const n = Number(raw);
  if (isNaN(n)) return null;
  return n.toLocaleString('de-DE');
}

// ── Token-Karte ───────────────────────────────────
function TokenCard({ dep, onClick }) {
  const tc  = TYPE_COLOR[dep.type]    || { fg: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  const nc  = NET_COLOR[dep.network]  || NET_COLOR.testnet;
  const supply = formatSupply(dep);

  return (
    <div
      onClick={() => onClick(dep)}
      style={{
        background:   'rgba(255,255,255,0.03)',
        border:       `1px solid rgba(255,255,255,0.08)`,
        borderRadius: '12px',
        padding:      '1.1rem 1.2rem',
        cursor:       'pointer',
        transition:   'border-color 0.15s, background 0.15s, transform 0.1s',
        display:      'flex',
        flexDirection:'column',
        gap:          '0.55rem',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${tc.fg}55`;
        e.currentTarget.style.background  = 'rgba(255,255,255,0.055)';
        e.currentTarget.style.transform   = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.transform   = 'none';
      }}
    >
      {/* Badges + Verified */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge label={dep.type} fg={tc.fg} bg={tc.bg} />
        <Badge label={dep.network === 'mainnet' ? 'Mainnet' : 'Devín'} fg={nc.fg} bg={nc.bg} />
        {dep.verified === 1 && <span style={{ fontSize: '0.7rem', color: '#22c55e', marginLeft: 'auto' }}>✓</span>}
      </div>

      {/* Name + Symbol */}
      <div>
        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.2 }}>
          {dep.name || (dep.type === 'CIP-1155' ? 'Multi-Token' : '–')}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.15rem' }}>
          {dep.symbol && <span style={{ color: tc.fg, fontWeight: '600' }}>{dep.symbol}</span>}
          {dep.decimals !== undefined && dep.type !== 'CIP-721' && dep.type !== 'CIP-1155' &&
            <span style={{ marginLeft: '6px' }}>{dep.decimals} dec</span>}
          {supply && <span style={{ marginLeft: '6px' }}>· {supply}</span>}
          {dep.type === 'CIP-721'  && <span style={{ marginLeft: '6px' }}>NFT Collection</span>}
          {dep.type === 'CIP-1155' && <span style={{ marginLeft: '6px' }}>Multi-Token</span>}
        </div>
      </div>

      {/* Datum + Adresse */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', fontSize: '0.75rem', color: '#475569' }}>
        <span>{formatDate(dep.timestamp)}</span>
        <a
          href={getExplorerUrl(dep.network, 'address', dep.contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: '#475569', fontFamily: 'monospace', textDecoration: 'none' }}
        >
          {dep.contractAddress.slice(0, 10)}…↗
        </a>
      </div>
    </div>
  );
}

// ── Detail-Modal ──────────────────────────────────
function DetailModal({ dep, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    getTokenDetails(dep.contractAddress)
      .then(d => setDetails(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dep.contractAddress]);

  function copyAddr() {
    navigator.clipboard.writeText(dep.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const tc = TYPE_COLOR[dep.type] || { fg: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  const nc = NET_COLOR[dep.network] || NET_COLOR.testnet;
  const d  = details || dep;

  function Row({ label, children }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'start', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ color: '#475569', fontSize: '0.78rem', paddingTop: '1px' }}>{label}</span>
        <span style={{ fontSize: '0.84rem', color: '#cbd5e1', wordBreak: 'break-all' }}>{children}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', border: `1px solid ${tc.fg}44`, borderRadius: '14px', padding: '1.6rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <Badge label={dep.type} fg={tc.fg} bg={tc.bg} />
            <Badge label={dep.network === 'mainnet' ? 'Mainnet' : 'Devín Testnet'} fg={nc.fg} bg={nc.bg} />
            {d.verified === 1 && <Badge label="✓ verified" fg="#22c55e" bg="rgba(34,197,94,0.12)" />}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e2e8f0' }}>
            {dep.name || (dep.type === 'CIP-1155' ? 'Multi-Token' : '–')}
          </div>
          {dep.symbol && <div style={{ color: tc.fg, fontWeight: '600', fontSize: '0.9rem', marginTop: '0.1rem' }}>{dep.symbol}</div>}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ color: '#475569', fontSize: '0.84rem', textAlign: 'center', padding: '1rem 0' }}>Lade Details...</div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>

            <Row label="Contract">
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', flex: 1 }}>{dep.contractAddress}</code>
                <button onClick={copyAddr} style={{ padding: '0.15rem 0.5rem', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: copied ? '#86efac' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </Row>

            {(d.totalSupply || d.initialSupply) && dep.type !== 'CIP-721' && (
              <Row label="Total Supply">
                {Number(d.totalSupply ?? d.initialSupply).toLocaleString('de-DE')} {dep.symbol}
              </Row>
            )}
            {d.decimals !== undefined && dep.type !== 'CIP-721' && dep.type !== 'CIP-1155' && (
              <Row label="Decimals">{d.decimals}</Row>
            )}
            {dep.type === 'CIP-777' && d.granularity && (
              <Row label="Granularity">{d.granularity}</Row>
            )}
            {dep.type === 'CIP-1155' && d.uri && (
              <Row label="Basis-URI"><span style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.76rem' }}>{d.uri}</span></Row>
            )}

            <Row label="Erstellt am">{formatDate(d.timestamp)}</Row>

            {d.blockNumber && (
              <Row label="Block">
                <a href={getExplorerUrl(dep.network, 'block', d.blockNumber)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                  #{Number(d.blockNumber).toLocaleString('de-DE')} ↗
                </a>
              </Row>
            )}

            {d.txHash && (
              <Row label="Creation TX">
                <a href={getExplorerUrl(dep.network, 'tx', d.txHash)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.76rem', textDecoration: 'none' }}>
                  {d.txHash.slice(0, 18)}…{d.txHash.slice(-8)} ↗
                </a>
              </Row>
            )}

            {d.deployer && (
              <Row label="Deployer">
                <a href={getExplorerUrl(dep.network, 'address', d.deployer)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.76rem', textDecoration: 'none' }}>
                  {d.deployer.slice(0, 16)}…{d.deployer.slice(-6)} ↗
                </a>
              </Row>
            )}

            {d.energyUsed && (
              <Row label="Energy Used">{Number(d.energyUsed).toLocaleString('de-DE')}</Row>
            )}

            <Row label="Verifikation">
              {d.verified === 1
                ? <span style={{ color: '#22c55e' }}>✓ Verified {d.verifiedAt ? `· ${formatDate(d.verifiedAt)}` : ''}</span>
                : d.verified === 2
                  ? <span style={{ color: '#f87171' }}>✗ Failed {d.verifyError ? <span title={d.verifyError}>ⓘ</span> : ''}</span>
                  : <span style={{ color: '#eab308' }}>⏳ Pending</span>}
            </Row>

          </div>
        )}

        {/* Explorer-Button */}
        <a
          href={getExplorerUrl(dep.network, 'address', dep.contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', padding: '0.55rem', textAlign: 'center', background: `${tc.fg}18`, border: `1px solid ${tc.fg}44`, borderRadius: '7px', color: tc.fg, fontSize: '0.86rem', fontWeight: '600', textDecoration: 'none' }}
        >
          Im Explorer ansehen ↗
        </a>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────
const ALL_TYPES = ['CIP-20', 'CIP-777', 'CIP-721', 'CIP-1155'];

export default function TokenInfoPage() {
  const [deployments, setDeployments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [netFilter,   setNetFilter]   = useState('all');   // 'all' | 'testnet' | 'mainnet'
  const [typeFilter,  setTypeFilter]  = useState('all');   // 'all' | 'CIP-20' | …
  const [selected,    setSelected]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeployments();
      setDeployments(data.deployments || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = deployments.filter(d => {
    if (netFilter  !== 'all' && d.network !== netFilter)  return false;
    if (typeFilter !== 'all' && d.type    !== typeFilter)  return false;
    return true;
  });

  // Anzahl pro Typ / Netz für Filter-Badges
  function countNet(n)  { return n === 'all' ? deployments.length : deployments.filter(d => d.network === n).length; }
  function countType(t) { return t === 'all' ? deployments.length : deployments.filter(d => d.type === t).length; }

  function FilterBtn({ value, active, label, count, onClick, color }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding:      '4px 11px',
          fontSize:     '0.78rem',
          fontWeight:   active ? '600' : '400',
          border:       active ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.09)',
          borderRadius: '6px',
          background:   active ? `${color}1a` : 'transparent',
          color:        active ? color : '#64748b',
          cursor:       'pointer',
          transition:   'all 0.12s',
        }}
      >
        {label}
        {count > 0 && <span style={{ marginLeft: '5px', opacity: 0.65, fontSize: '0.72rem' }}>{count}</span>}
      </button>
    );
  }

  return (
    <div>
      {/* Header-Bereich */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.3rem', background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Token-Übersicht
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.2rem' }}>
          Alle über SmartC deployed Tokens – Mainnet und Testnet.
        </p>

        {/* Filter-Zeile */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Netz */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <FilterBtn value="all"     active={netFilter==='all'}     label="Alle"    count={countNet('all')}     onClick={() => setNetFilter('all')}     color="#94a3b8" />
            <FilterBtn value="testnet" active={netFilter==='testnet'} label="Testnet" count={countNet('testnet')} onClick={() => setNetFilter('testnet')} color="#60a5fa" />
            <FilterBtn value="mainnet" active={netFilter==='mainnet'} label="Mainnet" count={countNet('mainnet')} onClick={() => setNetFilter('mainnet')} color="#f87171" />
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Typ */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <FilterBtn value="all" active={typeFilter==='all'} label="Alle Typen" count={0} onClick={() => setTypeFilter('all')} color="#94a3b8" />
            {ALL_TYPES.map(t => (
              <FilterBtn key={t} value={t} active={typeFilter===t} label={t} count={countType(t)} onClick={() => setTypeFilter(t)} color={TYPE_COLOR[t]?.fg || '#94a3b8'} />
            ))}
          </div>

          <button
            onClick={load}
            style={{ marginLeft: 'auto', padding: '4px 10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Inhalt */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#475569', padding: '3rem' }}>Lade...</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#475569', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
          <div>Keine Tokens für diese Filterauswahl vorhanden.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {visible.map(dep => (
            <TokenCard key={dep.id || dep.contractAddress} dep={dep} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Detail-Modal */}
      {selected && (
        <DetailModal dep={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
