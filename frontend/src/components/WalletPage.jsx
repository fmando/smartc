/**
 * WalletPage.jsx – Wallet-Verwaltung
 *
 * - Deployer-Wallet-Info (Adresse, XCB-Balance)
 * - Guthaben-Abfrage für beliebige Adressen (XCB + Token-Bestände)
 * - XCB senden
 * - CIP-20 / CIP-777 Token senden
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getWalletInfo, getWalletBalances, getDeployments,
  sendXCB, sendToken, getExplorerUrl, getTokenDetails,
} from '../services/api.js';

// ────────────────────────────────────────────
// Stil-Konstanten
// ────────────────────────────────────────────
const card = {
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.09)',
  borderRadius: '12px',
  padding:      '1.4rem',
};

const inputStyle = {
  width:        '100%',
  padding:      '0.6rem 0.8rem',
  background:   'rgba(255,255,255,0.06)',
  border:       '1px solid rgba(255,255,255,0.15)',
  borderRadius: '6px',
  color:        '#e2e8f0',
  fontSize:     '0.92rem',
  outline:      'none',
  boxSizing:    'border-box',
};

const labelStyle = {
  display:      'block',
  marginBottom: '0.35rem',
  color:        '#94a3b8',
  fontSize:     '0.82rem',
  fontWeight:   '500',
};

const hintStyle = {
  marginTop:  '0.3rem',
  color:      '#475569',
  fontSize:   '0.76rem',
};

function PrimaryBtn({ children, loading, color = '#2563eb', hoverColor, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      style={{
        width:        '100%',
        padding:      '0.65rem',
        marginTop:    '0.75rem',
        background:   loading || disabled ? 'rgba(255,255,255,0.05)' : color,
        border:       'none',
        borderRadius: '7px',
        color:        loading || disabled ? '#475569' : 'white',
        fontSize:     '0.92rem',
        fontWeight:   '600',
        cursor:       loading || disabled ? 'not-allowed' : 'pointer',
        transition:   'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.84rem', marginTop: '0.6rem' }}>
      {msg}
    </div>
  );
}

function SuccessBox({ children }) {
  return (
    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px', color: '#86efac', fontSize: '0.84rem', marginTop: '0.6rem' }}>
      {children}
    </div>
  );
}

const TYPE_COLOR = {
  'CIP-20':   '#60a5fa',
  'CIP-777':  '#a78bfa',
  'CIP-721':  '#22c55e',
  'CIP-1155': '#fb923c',
};

function TypeBadge({ type }) {
  return (
    <span style={{
      padding:      '1px 6px',
      borderRadius: '3px',
      fontSize:     '0.72rem',
      fontWeight:   '700',
      background:   `${TYPE_COLOR[type] || '#94a3b8'}22`,
      color:        TYPE_COLOR[type] || '#94a3b8',
      marginRight:  '0.4rem',
    }}>
      {type}
    </span>
  );
}

function TokenDetailModal({ token, network, onClose }) {
  const [copied,  setCopied]  = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  useEffect(() => {
    getTokenDetails(token.contractAddress)
      .then(d => setDetails(d))
      .catch(() => {})
      .finally(() => setDetailsLoading(false));
  }, [token.contractAddress]);

  function copyAddr() {
    navigator.clipboard.writeText(token.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function formatDate(iso) {
    if (!iso) return '–';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatSupply(val, decimals, symbol) {
    if (val === null || val === undefined) return '–';
    return `${Number(val).toLocaleString('de-DE')} ${symbol || ''}`.trim();
  }

  const color = TYPE_COLOR[token.type] || '#94a3b8';
  const d = details;

  // Zeile im Detail-Grid
  function Row({ label, children }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem', alignItems: 'start', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
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
        style={{ background: '#0f172a', border: `1px solid ${color}44`, borderRadius: '14px', padding: '1.6rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        {/* Schließen */}
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>
          ✕
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.3rem' }}>
          <div style={{ marginBottom: '0.4rem' }}>
            <TypeBadge type={token.type} />
            {d?.verified === 1 && <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '600' }}>✓ verified</span>}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#e2e8f0' }}>{token.name}</div>
          <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.1rem' }}>{token.symbol}</div>
        </div>

        {/* Guthaben-Box */}
        <div style={{ padding: '0.8rem 1rem', background: `${color}11`, border: `1px solid ${color}33`, borderRadius: '8px', marginBottom: '1rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Dein Guthaben</div>
          <div style={{ fontSize: '1.35rem', fontWeight: '700', color }}>
            {token.type === 'CIP-721'
              ? `${token.balance} NFT${token.balance !== '1' ? 's' : ''}`
              : `${Number(token.balance).toLocaleString('de-DE', { maximumFractionDigits: 6 })} ${token.symbol}`}
          </div>
          {token.type !== 'CIP-721' && token.decimals !== undefined && (
            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.2rem' }}>{token.decimals} Dezimalstellen</div>
          )}
        </div>

        {/* Detail-Rows */}
        {detailsLoading ? (
          <div style={{ color: '#475569', fontSize: '0.84rem', textAlign: 'center', padding: '1rem 0' }}>Lade Details...</div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>

            {/* Contract-Adresse */}
            <Row label="Contract">
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#94a3b8', flex: 1 }}>
                  {token.contractAddress}
                </code>
                <button onClick={copyAddr} style={{ padding: '0.15rem 0.5rem', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: copied ? '#86efac' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </Row>

            {/* Erstellt am */}
            <Row label="Erstellt am">{formatDate(d?.timestamp)}</Row>

            {/* Block */}
            {d?.blockNumber && (
              <Row label="Block">
                <a href={getExplorerUrl(network, 'block', d.blockNumber)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                  #{d.blockNumber.toLocaleString('de-DE')} ↗
                </a>
              </Row>
            )}

            {/* Creation TX */}
            {d?.txHash && (
              <Row label="Creation TX">
                <a href={getExplorerUrl(network, 'tx', d.txHash)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.76rem', textDecoration: 'none' }}>
                  {d.txHash.slice(0, 20)}…{d.txHash.slice(-8)} ↗
                </a>
              </Row>
            )}

            {/* Deployer */}
            {d?.deployer && (
              <Row label="Deployer">
                <a href={getExplorerUrl(network, 'address', d.deployer)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.76rem', textDecoration: 'none' }}>
                  {d.deployer.slice(0, 16)}…{d.deployer.slice(-6)} ↗
                </a>
              </Row>
            )}

            {/* Total Supply */}
            {(d?.totalSupply || d?.initialSupply) && token.type !== 'CIP-721' && (
              <Row label="Total Supply">
                {formatSupply(d.totalSupply ?? d.initialSupply, d.decimals, token.symbol)}
              </Row>
            )}

            {/* Energy Used */}
            {d?.energyUsed && (
              <Row label="Energy Used">
                {Number(d.energyUsed).toLocaleString('de-DE')}
              </Row>
            )}

            {/* Verifikation */}
            <Row label="Verifikation">
              {d?.verified === 1
                ? <span style={{ color: '#22c55e' }}>✓ Verified {d.verifiedAt ? `(${formatDate(d.verifiedAt)})` : ''}</span>
                : d?.verified === 2
                  ? <span style={{ color: '#f87171' }}>✗ Failed</span>
                  : <span style={{ color: '#eab308' }}>⏳ Pending</span>}
            </Row>

          </div>
        )}

        {/* Explorer-Link */}
        <a
          href={getExplorerUrl(network, 'address', token.contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', padding: '0.55rem', textAlign: 'center', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: '7px', color, fontSize: '0.86rem', fontWeight: '600', textDecoration: 'none' }}
        >
          Im Explorer ansehen ↗
        </a>
      </div>
    </div>
  );
}

function truncate(str, len = 16) {
  if (!str || str.length <= len * 2) return str;
  return `${str.slice(0, len)}…${str.slice(-8)}`;
}

// ────────────────────────────────────────────
// Deployer-Wallet-Karte
// ────────────────────────────────────────────
function WalletInfoCard({ network, currency }) {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setInfo(await getWalletInfo()); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch, network]);

  function copyAddr() {
    if (info?.address) {
      navigator.clipboard.writeText(info.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const isMainnet = network === 'mainnet';

  return (
    <div style={{
      ...card,
      background:   isMainnet ? 'rgba(220,38,38,0.05)' : 'rgba(37,99,235,0.05)',
      border:       `1px solid ${isMainnet ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.15)'}`,
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: isMainnet ? '#fca5a5' : '#93c5fd' }}>
          💳 Deployer-Wallet
        </h2>
        <button
          onClick={fetch}
          style={{ padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          ↻ Aktualisieren
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#475569', fontSize: '0.9rem' }}>Lade...</div>
      ) : !info?.address ? (
        <div style={{ color: '#f87171', fontSize: '0.88rem' }}>
          Kein Deployer konfiguriert. Bitte <code>DEPLOYER_PRIVATE_KEY</code> oder <code>DEPLOYER_ADDRESS</code> in <code>.env</code> setzen.
        </div>
      ) : (
        <>
        {isMainnet && parseFloat(info?.balance ?? '0') < 1 && (
          <div style={{ padding: '0.7rem 1rem', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#fca5a5' }}>
            <strong>Mainnet nicht bereit</strong> – Balance unter 1 {currency}.<br/>
            Wallet aufladen: <code style={{ wordBreak: 'break-all', color: '#fcd34d' }}>{info.address}</code>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.5rem 1.5rem', alignItems: 'center' }}>
          {/* Adresse */}
          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Adresse</span>
          <code style={{ fontFamily: 'monospace', fontSize: '0.84rem', color: '#e2e8f0', wordBreak: 'break-all' }}>
            {info.address}
          </code>
          <button
            onClick={copyAddr}
            title="Adresse kopieren"
            style={{ padding: '0.25rem 0.6rem', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: copied ? '#86efac' : '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
          >
            {copied ? '✓ Kopiert' : '📋 Kopieren'}
          </button>

          {/* Balance */}
          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Guthaben</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: isMainnet ? '#fca5a5' : '#60a5fa' }}>
            {info.balance !== null ? `${Number(info.balance).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}` : '–'}
          </span>
          <span />

          {/* Netz */}
          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Netzwerk</span>
          <span style={{ fontSize: '0.88rem', color: isMainnet ? '#fca5a5' : '#93c5fd', fontWeight: '600' }}>
            {isMainnet ? 'Core Coin Mainnet' : 'Devín Testnet'}
          </span>
          <span />
        </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Guthaben abfragen
// ────────────────────────────────────────────
function BalanceChecker({ network, deployerAddress, currency }) {
  const [address,       setAddress]       = useState('');
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  async function handleCheck(e) {
    e.preventDefault();
    if (!address.trim()) return setError('Bitte eine Adresse eingeben');
    setLoading(true);
    setError(null);
    setResult(null);
    try { setResult(await getWalletBalances(address.trim())); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function fillOwn() {
    if (deployerAddress) setAddress(deployerAddress);
  }

  const isMainnet = network === 'mainnet';

  return (
    <div style={card}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', color: '#60a5fa' }}>
        🔍 Guthaben abfragen
      </h3>

      <form onSubmit={handleCheck}>
        <label style={labelStyle}>Adresse</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={address}
            onChange={e => { setAddress(e.target.value); setError(null); }}
            placeholder={isMainnet ? 'CB...' : 'AB...'}
            style={{ ...inputStyle, flex: 1 }}
          />
          {deployerAddress && (
            <button
              type="button"
              onClick={fillOwn}
              title="Eigene Deployer-Adresse einfügen"
              style={{ padding: '0 0.8rem', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Eigene
            </button>
          )}
        </div>

        <ErrorBox msg={error} />

        <PrimaryBtn loading={loading} color="#1d4ed8">
          {loading ? '⏳ Prüfe...' : '🔍 Guthaben abfragen'}
        </PrimaryBtn>
      </form>

      {/* Token-Detail-Modal */}
      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          network={network}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {/* Ergebnis */}
      {result && (
        <div style={{ marginTop: '1.2rem' }}>
          {/* XCB */}
          <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '8px', marginBottom: '0.8rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>{currency}-Guthaben</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#60a5fa' }}>
              {Number(result.xcb.balance).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {currency}
            </div>
          </div>

          {/* Token-Bestände */}
          {result.tokens.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Token-Bestände <span style={{ fontWeight: '400', color: '#334155' }}>– klicken für Details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {result.tokens.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedToken(t)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.7rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = `${TYPE_COLOR[t.type] || '#94a3b8'}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <div>
                      <TypeBadge type={t.type} />
                      <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{t.symbol || t.name}</span>
                      {t.name && t.symbol && <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.4rem' }}>{t.name}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: TYPE_COLOR[t.type] || '#e2e8f0' }}>
                        {t.type === 'CIP-721'
                          ? `${t.balance} NFT${t.balance !== '1' ? 's' : ''}`
                          : Number(t.balance).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                      </span>
                      <span style={{ color: '#334155', fontSize: '0.75rem' }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#475569', fontSize: '0.84rem', textAlign: 'center', padding: '0.8rem' }}>
              Keine Token-Bestände gefunden.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// XCB senden
// ────────────────────────────────────────────
function SendXCB({ network, currency }) {
  const [to,      setTo]      = useState('');
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [confirm, setConfirm] = useState(false);

  const isMainnet = network === 'mainnet';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!to.trim())          return setError('Empfänger-Adresse ist erforderlich');
    if (!amount || Number(amount) <= 0) return setError('Betrag muss größer als 0 sein');

    if (isMainnet && !confirm) { setConfirm(true); return; }
    setConfirm(false);

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendXCB({ to: to.trim(), amount });
      setResult(res);
      setTo('');
      setAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', color: '#a78bfa' }}>
        📤 {currency} senden
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.9rem' }}>
          <label style={labelStyle}>Empfänger</label>
          <input
            value={to}
            onChange={e => { setTo(e.target.value); setError(null); setConfirm(false); }}
            placeholder={isMainnet ? 'CB...' : 'AB...'}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '0.9rem' }}>
          <label style={labelStyle}>Betrag ({currency})</label>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(null); setConfirm(false); }}
            placeholder="0.00"
            min="0"
            step="any"
            style={inputStyle}
          />
          <div style={hintStyle}>Vom Deployer-Wallet. Inklusive Energy-Fee.</div>
        </div>

        <ErrorBox msg={error} />

        {result && (
          <SuccessBox>
            {amount} {currency} gesendet! TX:{' '}
            <a
              href={getExplorerUrl(network, 'tx', result.txHash)}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#a78bfa' }}
            >
              {truncate(result.txHash, 8)}↗
            </a>
          </SuccessBox>
        )}

        {confirm && (
          <div style={{ padding: '0.8rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '7px', marginTop: '0.6rem', fontSize: '0.85rem', color: '#fca5a5' }}>
            <strong>Mainnet bestätigen:</strong> Wirklich {amount} {currency} an {truncate(to, 10)} senden?
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.5rem', background: '#dc2626', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                {loading ? '⏳...' : 'Ja, senden'}
              </button>
              <button type="button" onClick={() => setConfirm(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '5px', color: '#94a3b8', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {!confirm && (
          <PrimaryBtn loading={loading} color={isMainnet ? '#dc2626' : '#7c3aed'}>
            {loading ? '⏳ Sende...' : isMainnet ? `⚠️ ${currency} senden (Mainnet)` : `📤 ${currency} senden`}
          </PrimaryBtn>
        )}
      </form>
    </div>
  );
}

// ────────────────────────────────────────────
// Token senden
// ────────────────────────────────────────────
function SendToken({ network }) {
  const [tokens,   setTokens]   = useState([]);
  const [selected, setSelected] = useState('');
  const [to,       setTo]       = useState('');
  const [amount,   setAmount]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [confirm,  setConfirm]  = useState(false);

  const isMainnet = network === 'mainnet';

  // Sendbare Token laden (CIP-20 + CIP-777 des aktuellen Netzwerks)
  useEffect(() => {
    getDeployments()
      .then(data => {
        const sendable = (data.deployments || [])
          .filter(d => ['CIP-20', 'CIP-777'].includes(d.type) && d.network === network);
        setTokens(sendable);
        if (sendable.length > 0) setSelected(sendable[0].contractAddress);
      })
      .catch(() => {});
  }, [network]);

  const selectedToken = tokens.find(t => t.contractAddress === selected);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected)                       return setError('Bitte einen Token auswählen');
    if (!to.trim())                      return setError('Empfänger-Adresse ist erforderlich');
    if (!amount || Number(amount) <= 0)  return setError('Betrag muss größer als 0 sein');

    if (isMainnet && !confirm) { setConfirm(true); return; }
    setConfirm(false);

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendToken({ contractAddress: selected, to: to.trim(), amount });
      setResult({ ...res, symbol: selectedToken?.symbol });
      setTo('');
      setAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const accentColor = selectedToken ? (TYPE_COLOR[selectedToken.type] || '#60a5fa') : '#60a5fa';

  return (
    <div style={card}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', color: '#22c55e' }}>
        🪙 Token senden
      </h3>

      {tokens.length === 0 ? (
        <div style={{ color: '#475569', fontSize: '0.86rem', padding: '1rem 0' }}>
          Keine CIP-20 / CIP-777 Tokens auf diesem Netz deployed.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Token-Auswahl */}
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>Token</label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setError(null); setConfirm(false); }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {tokens.map(t => (
                <option
                  key={t.contractAddress}
                  value={t.contractAddress}
                  style={{ background: '#1e293b', color: '#e2e8f0' }}
                >
                  [{t.type}] {t.symbol} – {t.name}
                </option>
              ))}
            </select>
            {selectedToken && (
              <div style={hintStyle}>
                {truncate(selectedToken.contractAddress, 18)} · {selectedToken.decimals ?? 18} Decimals
              </div>
            )}
          </div>

          {/* Empfänger */}
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>Empfänger</label>
            <input
              value={to}
              onChange={e => { setTo(e.target.value); setError(null); setConfirm(false); }}
              placeholder={isMainnet ? 'CB...' : 'AB...'}
              style={inputStyle}
            />
          </div>

          {/* Betrag */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Betrag ({selectedToken?.symbol || 'Token'})</label>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(null); setConfirm(false); }}
              placeholder="0"
              min="0"
              step="any"
              style={inputStyle}
            />
            <div style={hintStyle}>In Token-Einheiten (nicht Wei).</div>
          </div>

          <ErrorBox msg={error} />

          {result && (
            <SuccessBox>
              {result.symbol || 'Token'} gesendet! TX:{' '}
              <a
                href={getExplorerUrl(network, 'tx', result.txHash)}
                target="_blank" rel="noopener noreferrer"
                style={{ color: accentColor }}
              >
                {truncate(result.txHash, 8)}↗
              </a>
            </SuccessBox>
          )}

          {confirm && (
            <div style={{ padding: '0.8rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '7px', marginTop: '0.6rem', fontSize: '0.85rem', color: '#fca5a5' }}>
              <strong>Mainnet bestätigen:</strong> Wirklich {amount} {selectedToken?.symbol} an {truncate(to, 10)} senden?
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.5rem', background: '#dc2626', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  {loading ? '⏳...' : 'Ja, senden'}
                </button>
                <button type="button" onClick={() => setConfirm(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '5px', color: '#94a3b8', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!confirm && (
            <PrimaryBtn loading={loading} color={isMainnet ? '#dc2626' : '#16a34a'}>
              {loading ? '⏳ Sende...' : isMainnet ? `⚠️ ${selectedToken?.symbol || 'Token'} senden (Mainnet)` : `🪙 ${selectedToken?.symbol || 'Token'} senden`}
            </PrimaryBtn>
          )}
        </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Haupt-Komponente
// ────────────────────────────────────────────
export default function WalletPage({ network, currency = 'XCB' }) {
  const [walletInfo, setWalletInfo] = useState(null);

  useEffect(() => {
    getWalletInfo()
      .then(info => setWalletInfo(info))
      .catch(() => {});
  }, [network]);

  return (
    <div>
      {/* Wallet-Info oben */}
      <WalletInfoCard network={network} currency={currency} />

      {/* Zwei-Spalten-Grid */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
        className="two-col-grid"
      >
        {/* Links: Guthaben abfragen */}
        <BalanceChecker
          network={network}
          deployerAddress={walletInfo?.address}
          currency={currency}
        />

        {/* Rechts: XCB senden + Token senden */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <SendXCB network={network} currency={currency} />
          <SendToken network={network} />
        </div>
      </div>
    </div>
  );
}
