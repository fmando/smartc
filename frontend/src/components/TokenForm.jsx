/**
 * TokenForm.jsx – Token Deployment Formular
 *
 * CIP-20  | CIP-777 | CIP-721 | CIP-1155
 */

import React, { useState } from 'react';
import { deployToken, deployCIP777, deployCIP721, deployCIP1155 } from '../services/api.js';

const CIP_STANDARDS = [
  { id: 'cip20',   label: 'CIP-20',   description: 'Fungible Token',         available: true  },
  { id: 'cip777',  label: 'CIP-777',  description: 'Advanced Fungible Token', available: true  },
  { id: 'cip721',  label: 'CIP-721',  description: 'Non-Fungible Token (NFT)', available: true  },
  { id: 'cip1155', label: 'CIP-1155', description: 'Multi-Token Standard',    available: true  },
];

const styles = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '1rem',
    flexWrap: 'wrap',
  },
  tab: (active, available) => ({
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: available ? 'pointer' : 'not-allowed',
    background: active ? '#2563eb' : 'rgba(255,255,255,0.05)',
    color: available ? (active ? 'white' : '#cbd5e1') : '#475569',
    fontSize: '0.85rem',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.15s',
    opacity: available ? 1 : 0.5,
  }),
  tabBadge: {
    fontSize: '0.7rem',
    padding: '1px 5px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '3px',
    marginLeft: '4px',
  },
  formGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  hint: {
    marginTop: '0.3rem',
    color: '#64748b',
    fontSize: '0.78rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  button: (loading) => ({
    width: '100%',
    padding: '0.8rem',
    background: loading ? '#1e3a8a' : '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '0.5rem',
    transition: 'background 0.15s',
  }),
  comingSoon: {
    textAlign: 'center',
    padding: '3rem',
    color: '#475569',
  },
};

const DEFAULT_FORM     = { name: '', symbol: '', decimals: '18', totalSupply: '1000000' };
const DEFAULT_CIP777   = { name: '', symbol: '', initialSupply: '1000000', granularity: '1' };
const DEFAULT_CIP721   = { name: '', symbol: '' };
const DEFAULT_CIP1155  = { uri: '' };

export default function TokenForm({ onDeploySuccess, network = 'testnet', onTabChange }) {
  const [activeTab, setActiveTab] = useState('cip20');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [cip777Form, setCip777Form] = useState(DEFAULT_CIP777);
  const [cip721Form, setCip721Form] = useState(DEFAULT_CIP721);
  const [cip1155Form, setCip1155Form] = useState(DEFAULT_CIP1155);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mainnetConfirm, setMainnetConfirm] = useState(false);

  const isMainnet = network === 'mainnet';

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleCip777Change(e) {
    setCip777Form((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleCip721Change(e) {
    setCip721Form((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleCip1155Change(e) {
    setCip1155Form((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleTabChange(id) {
    setActiveTab(id);
    setError(null);
    setMainnetConfirm(false);
    onTabChange?.(id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (isMainnet && !mainnetConfirm) {
      setMainnetConfirm(true);
      return;
    }
    setMainnetConfirm(false);

    if (activeTab === 'cip20') {
      if (!form.name.trim()) return setError('Token-Name ist erforderlich');
      if (!form.symbol.trim()) return setError('Symbol ist erforderlich');
      if (Number(form.decimals) < 0 || Number(form.decimals) > 18) return setError('Decimals muss zwischen 0 und 18 liegen');
      if (Number(form.totalSupply) <= 0) return setError('TotalSupply muss größer als 0 sein');
    } else if (activeTab === 'cip777') {
      if (!cip777Form.name.trim()) return setError('Token-Name ist erforderlich');
      if (!cip777Form.symbol.trim()) return setError('Symbol ist erforderlich');
      if (Number(cip777Form.initialSupply) <= 0) return setError('InitialSupply muss größer als 0 sein');
      if (Number(cip777Form.granularity) < 1) return setError('Granularity muss mindestens 1 sein');
    } else if (activeTab === 'cip721') {
      if (!cip721Form.name.trim()) return setError('Collection-Name ist erforderlich');
      if (!cip721Form.symbol.trim()) return setError('Symbol ist erforderlich');
    }
    // CIP-1155: uri ist optional, keine Pflichtfelder

    setLoading(true);
    try {
      if (activeTab === 'cip20') {
        const result = await deployToken({
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          decimals: Number(form.decimals),
          totalSupply: form.totalSupply,
        });
        setForm(DEFAULT_FORM);
        onDeploySuccess?.(result.deployment);

      } else if (activeTab === 'cip777') {
        const result = await deployCIP777({
          name: cip777Form.name.trim(),
          symbol: cip777Form.symbol.trim().toUpperCase(),
          initialSupply: cip777Form.initialSupply,
          granularity: Number(cip777Form.granularity) || 1,
        });
        setCip777Form(DEFAULT_CIP777);
        onDeploySuccess?.(result.deployment);

      } else if (activeTab === 'cip721') {
        const result = await deployCIP721({
          name: cip721Form.name.trim(),
          symbol: cip721Form.symbol.trim().toUpperCase(),
        });
        setCip721Form(DEFAULT_CIP721);
        onDeploySuccess?.(result.deployment);

      } else if (activeTab === 'cip1155') {
        const result = await deployCIP1155({
          uri: cip1155Form.uri.trim(),
        });
        setCip1155Form(DEFAULT_CIP1155);
        onDeploySuccess?.(result.deployment);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
        Token Deployen
      </h2>

      {/* CIP Standard Tabs */}
      <div style={styles.tabs}>
        {CIP_STANDARDS.map((std) => (
          <button
            key={std.id}
            style={styles.tab(activeTab === std.id, std.available)}
            onClick={() => std.available && handleTabChange(std.id)}
            title={std.description}
          >
            {std.label}
          </button>
        ))}
      </div>

      {/* CIP-20 Formular */}
      {activeTab === 'cip20' && (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Token-Name *</label>
            <input
              style={styles.input}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="z.B. My Awesome Token"
              maxLength={50}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Symbol *</label>
              <input
                style={styles.input}
                type="text"
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
                placeholder="z.B. MAT"
                maxLength={10}
                required
              />
              <div style={styles.hint}>Max. 10 Zeichen, wird großgeschrieben</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Decimals</label>
              <input
                style={styles.input}
                type="number"
                name="decimals"
                value={form.decimals}
                onChange={handleChange}
                min="0"
                max="18"
                required
              />
              <div style={styles.hint}>Standard: 18 (wie XCB)</div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Total Supply *</label>
            <input
              style={styles.input}
              type="number"
              name="totalSupply"
              value={form.totalSupply}
              onChange={handleChange}
              placeholder="1000000"
              min="1"
              required
            />
            <div style={styles.hint}>
              Gesamtmenge in Token-Einheiten (nicht Wei).
              {form.totalSupply && form.decimals &&
                ` = ${(BigInt(form.totalSupply || 0) * 10n ** BigInt(form.decimals || 0)).toString()} Wei`
              }
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {mainnetConfirm && (
            <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', color: '#fca5a5' }}>
              <strong>Mainnet-Deployment bestätigen</strong>
              <p style={{ marginTop: '0.4rem', color: '#f87171', lineHeight: '1.5' }}>
                Du deployest auf das <strong>Mainnet</strong>. Das kostet echtes XCB.
                Bitte prüfe die Eingaben nochmals:
              </p>
              <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', lineHeight: '1.8', color: '#fca5a5' }}>
                <li>Name: <strong>{form.name}</strong></li>
                <li>Symbol: <strong>{form.symbol.toUpperCase()}</strong></li>
                <li>Supply: <strong>{Number(form.totalSupply).toLocaleString()}</strong></li>
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button type="submit" style={{ ...styles.button(loading), background: '#dc2626', flex: 1 }} disabled={loading}>
                  {loading ? '⏳ Deploying...' : 'Ja, Mainnet-Deployment starten'}
                </button>
                <button type="button" onClick={() => setMainnetConfirm(false)} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!mainnetConfirm && (
            <button type="submit" style={styles.button(loading)} disabled={loading}>
              {loading ? '⏳ Deploying...' : isMainnet ? '⚠️ Auf Mainnet deployen' : '🚀 Token Deployen'}
            </button>
          )}

          <div style={{ ...styles.hint, textAlign: 'center', marginTop: '0.7rem' }}>
            {isMainnet
              ? 'Deployment signiert lokal. Gas-Fees werden vom Deployer-Wallet bezahlt.'
              : 'Das Deployment wird sicher über die Server-Konfiguration signiert.'}
          </div>
        </form>
      )}

      {/* CIP-777 Formular */}
      {activeTab === 'cip777' && (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Token-Name *</label>
            <input style={styles.input} type="text" name="name" value={cip777Form.name}
              onChange={handleCip777Change} placeholder="z.B. My Advanced Token" maxLength={50} required />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Symbol *</label>
              <input style={styles.input} type="text" name="symbol" value={cip777Form.symbol}
                onChange={handleCip777Change} placeholder="z.B. MAT" maxLength={10} required />
              <div style={styles.hint}>Max. 10 Zeichen</div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Granularity</label>
              <input style={styles.input} type="number" name="granularity" value={cip777Form.granularity}
                onChange={handleCip777Change} min="1" required />
              <div style={styles.hint}>Mindest-Transfereinheit (Standard: 1)</div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Initial Supply *</label>
            <input style={styles.input} type="number" name="initialSupply" value={cip777Form.initialSupply}
              onChange={handleCip777Change} placeholder="1000000" min="1" required />
            <div style={styles.hint}>Gesamtmenge bei Deployment (18 Dezimalstellen)</div>
          </div>

          {error && (
            <div style={{ padding: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {mainnetConfirm && (
            <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', color: '#fca5a5' }}>
              <strong>Mainnet-Deployment bestätigen</strong>
              <p style={{ marginTop: '0.4rem', color: '#f87171', lineHeight: '1.5' }}>
                CIP-777 Token <strong>{cip777Form.name}</strong> ({cip777Form.symbol.toUpperCase()}) auf Mainnet – kostet echtes XCB.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button type="submit" style={{ ...styles.button(loading), background: '#dc2626', flex: 1 }} disabled={loading}>
                  {loading ? '⏳ Deploying...' : 'Ja, Mainnet-Deployment starten'}
                </button>
                <button type="button" onClick={() => setMainnetConfirm(false)} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!mainnetConfirm && (
            <button type="submit" style={{ ...styles.button(loading), background: loading ? '#3b1f8c' : '#7c3aed' }} disabled={loading}>
              {loading ? '⏳ Deploying...' : isMainnet ? '⚠️ Auf Mainnet deployen' : '🚀 CIP-777 Token Deployen'}
            </button>
          )}

          <div style={{ ...styles.hint, textAlign: 'center', marginTop: '0.7rem' }}>
            Deployment wird sicher über die Server-Konfiguration signiert.
          </div>
        </form>
      )}

      {/* CIP-721 Formular */}
      {activeTab === 'cip721' && (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Collection-Name *</label>
            <input style={styles.input} type="text" name="name" value={cip721Form.name}
              onChange={handleCip721Change} placeholder="z.B. My NFT Collection" maxLength={50} required />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Symbol *</label>
            <input style={styles.input} type="text" name="symbol" value={cip721Form.symbol}
              onChange={handleCip721Change} placeholder="z.B. MNFT" maxLength={10} required />
            <div style={styles.hint}>Max. 10 Zeichen, wird großgeschrieben</div>
          </div>

          <div style={{ padding: '0.7rem', background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Nach dem Deployment kannst du NFTs über <code>mint(address, tokenURI)</code> prägen.
            Jeder NFT erhält eine auto-incrementierte Token-ID (1, 2, 3, ...).
          </div>

          {error && (
            <div style={{ padding: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {mainnetConfirm && (
            <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', color: '#fca5a5' }}>
              <strong>Mainnet-Deployment bestätigen</strong>
              <p style={{ marginTop: '0.4rem', color: '#f87171', lineHeight: '1.5' }}>
                NFT-Collection <strong>{cip721Form.name}</strong> ({cip721Form.symbol.toUpperCase()}) auf Mainnet – kostet echtes XCB.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button type="submit" style={{ ...styles.button(loading), background: '#dc2626', flex: 1 }} disabled={loading}>
                  {loading ? '⏳ Deploying...' : 'Ja, Mainnet-Deployment starten'}
                </button>
                <button type="button" onClick={() => setMainnetConfirm(false)} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!mainnetConfirm && (
            <button type="submit" style={{ ...styles.button(loading), background: loading ? '#14532d' : '#16a34a' }} disabled={loading}>
              {loading ? '⏳ Deploying...' : isMainnet ? '⚠️ Auf Mainnet deployen' : '🎨 NFT-Collection Deployen'}
            </button>
          )}

          <div style={{ ...styles.hint, textAlign: 'center', marginTop: '0.7rem' }}>
            Deployment wird sicher über die Server-Konfiguration signiert.
          </div>
        </form>
      )}

      {/* CIP-1155 Formular */}
      {activeTab === 'cip1155' && (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Basis-URI (optional)</label>
            <input
              style={styles.input}
              type="text"
              name="uri"
              value={cip1155Form.uri}
              onChange={handleCip1155Change}
              placeholder="z.B. https://meta.example.com/{id}.json"
              maxLength={200}
            />
            <div style={styles.hint}>
              Template-URL für Token-Metadaten. <code>{'{id}'}</code> wird durch die Token-ID ersetzt.
              Kann auch leer bleiben und später pro Token gesetzt werden.
            </div>
          </div>

          <div style={{ padding: '0.7rem', background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Nach dem Deployment kannst du Token prägen mit:<br />
            <code>mint(address, tokenId, amount, tokenUri, data)</code> – einzelner Token-Typ<br />
            <code>mintBatch(address, ids[], amounts[], data)</code> – mehrere Typen auf einmal
          </div>

          {error && (
            <div style={{ padding: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {mainnetConfirm && (
            <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', color: '#fca5a5' }}>
              <strong>Mainnet-Deployment bestätigen</strong>
              <p style={{ marginTop: '0.4rem', color: '#f87171', lineHeight: '1.5' }}>
                CIP-1155 Multi-Token Contract auf Mainnet – kostet echtes XCB.
                {cip1155Form.uri && <> URI: <strong>{cip1155Form.uri}</strong></>}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button type="submit" style={{ ...styles.button(loading), background: '#dc2626', flex: 1 }} disabled={loading}>
                  {loading ? '⏳ Deploying...' : 'Ja, Mainnet-Deployment starten'}
                </button>
                <button type="button" onClick={() => setMainnetConfirm(false)} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!mainnetConfirm && (
            <button type="submit" style={{ ...styles.button(loading), background: loading ? '#7c3313' : '#ea580c' }} disabled={loading}>
              {loading ? '⏳ Deploying...' : isMainnet ? '⚠️ Auf Mainnet deployen' : '🗂️ Multi-Token Contract Deployen'}
            </button>
          )}

          <div style={{ ...styles.hint, textAlign: 'center', marginTop: '0.7rem' }}>
            Deployment wird sicher über die Server-Konfiguration signiert.
          </div>
        </form>
      )}
    </div>
  );
}
