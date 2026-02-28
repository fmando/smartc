/**
 * App.jsx – Haupt-Anwendungskomponente
 *
 * XCB Smart Contract Web App
 * Weboberfläche zur Erzeugung von CIP-20 Tokens auf der Core Coin Blockchain
 */

import React, { useState, useCallback, useEffect } from 'react';
import NetworkBadge from './components/NetworkBadge.jsx';
import TokenForm from './components/TokenForm.jsx';
import DeployStatus from './components/DeployStatus.jsx';
import TokenList from './components/TokenList.jsx';
import CipInfoCard from './components/CipInfoCard.jsx';
import TokenManage from './components/TokenManage.jsx';
import WalletPage from './components/WalletPage.jsx';
import { getNetwork } from './services/api.js';

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1117 0%, #111827 50%, #0f1117 100%)',
    color: '#e2e8f0',
  },
  header: {
    padding: '1rem 2rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '1.1rem',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    display: 'block',
  },
  main: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  hero: {
    marginBottom: '2rem',
    padding: '1.5rem',
    background: 'rgba(37,99,235,0.06)',
    border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: '12px',
  },
  heroTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  },
  heroLinks: {
    marginTop: '0.8rem',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  heroLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  mainnetWarning: {
    marginBottom: '1.5rem',
    padding: '1rem 1.5rem',
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '12px',
    color: '#fca5a5',
    fontSize: '0.9rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: '#334155',
    fontSize: '0.8rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    marginTop: '2rem',
  },
};

const mediaStyle = `
  @media (max-width: 700px) {
    .two-col-grid { grid-template-columns: 1fr !important; }
    .manage-grid  { grid-template-columns: 1fr !important; }
  }
  input:focus, input:hover {
    border-color: rgba(96,165,250,0.5) !important;
  }
`;

export default function App() {
  const [page, setPage] = useState('deploy'); // 'deploy' | 'manage'
  const [activeTab, setActiveTab] = useState('cip20');
  const [lastDeployment, setLastDeployment] = useState(null);
  const [listRefresh, setListRefresh] = useState(0);
  const [networkInfo, setNetworkInfo] = useState(null);

  // Netzwerk-Info laden (für dynamische Texte/Links)
  const fetchNetworkInfo = useCallback(async () => {
    try {
      const data = await getNetwork();
      setNetworkInfo(data);
    } catch {
      // Fallback: networkInfo bleibt null
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const handleDeploySuccess = useCallback((deployment) => {
    setLastDeployment(deployment);
    setListRefresh((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCloseStatus = useCallback(() => {
    setLastDeployment(null);
  }, []);

  const network = networkInfo?.current || 'testnet';
  const config = networkInfo?.config || {
    name: 'Devín Testnet',
    networkId: 3,
    addressPrefix: 'AB',
    explorer: 'https://xab.blockindex.net',
  };
  const isMainnet = network === 'mainnet';

  return (
    <div style={styles.app}>
      <style>{mediaStyle}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>X</div>
          <div>
            <span style={styles.logoText}>XCB SmartC</span>
            <span style={styles.logoSub}>Core Coin Smart Contract Manager</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Seiten-Navigation */}
          <nav style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
            {[
              { id: 'deploy', label: '🚀 Deployen' },
              { id: 'manage', label: '🗂️ Verwalten' },
              { id: 'wallet', label: '💳 Wallet'    },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPage(p.id)}
                style={{
                  padding: '0.35rem 0.85rem',
                  border: page === p.id ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  background: page === p.id ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: page === p.id ? '#60a5fa' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: page === p.id ? '600' : '400',
                }}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <NetworkBadge onNetworkChange={fetchNetworkInfo} />
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>

        {/* Mainnet-Warnung */}
        {isMainnet && (
          <div style={styles.mainnetWarning}>
            <strong>Mainnet aktiv.</strong> Deployments kosten echtes XCB.
            Stelle sicher, dass dein Deployer-Wallet ausreichend XCB für Gas-Fees enthält.
          </div>
        )}

        {/* ===== SEITE: VERWALTEN ===== */}
        {page === 'manage' && (
          <TokenManage onBack={() => setPage('deploy')} />
        )}

        {/* ===== SEITE: WALLET ===== */}
        {page === 'wallet' && (
          <WalletPage network={network} />
        )}

        {/* ===== SEITE: DEPLOYEN ===== */}
        {page === 'deploy' && (
          <>
            {/* Hero */}
            <div style={styles.hero}>
              <div style={styles.heroTitle}>Smart Contracts auf der XCB Blockchain deployen</div>
              <div style={styles.heroText}>
                Erstelle und deploye CIP Token Contracts direkt über den Browser.
                Kein technisches Vorwissen erforderlich – Formular ausfüllen und deployen.
              </div>
              <div style={styles.heroLinks}>
                <a href={config.explorer} target="_blank" rel="noopener noreferrer" style={styles.heroLink}>
                  🔍 {config.name} Explorer ↗
                </a>
                <a href="https://cip.coreblockchain.net" target="_blank" rel="noopener noreferrer" style={styles.heroLink}>
                  📄 CIP Standards ↗
                </a>
                <a href="https://coreblockchain.net" target="_blank" rel="noopener noreferrer" style={styles.heroLink}>
                  🌐 Core Coin ↗
                </a>
              </div>
            </div>

            {/* Deployment-Ergebnis */}
            {lastDeployment && (
              <div style={{ marginBottom: '1.5rem' }}>
                <DeployStatus
                  deployment={lastDeployment}
                  network={lastDeployment.network || network}
                  onClose={handleCloseStatus}
                />
              </div>
            )}

            {/* Haupt-Grid: Form + Info */}
            <div style={{ ...styles.grid }} className="two-col-grid">
              {/* Token-Formular */}
              <TokenForm
                onDeploySuccess={handleDeploySuccess}
                network={network}
                onTabChange={setActiveTab}
              />

              {/* Rechte Spalte: dynamische CIP-Info + Prozess + Netz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Dynamische CIP-Info-Karte */}
                <CipInfoCard tab={activeTab} />

                {/* Prozess-Info */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '1.2rem',
                }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.8rem', color: '#a78bfa' }}>
                    So funktioniert das Deployment
                  </h3>
                  <ol style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '2', paddingLeft: '1.2rem' }}>
                    <li>Formular ausfüllen und Parameter prüfen</li>
                    <li>Server signiert die Transaktion lokal</li>
                    <li>Contract wird deployed und bestätigt</li>
                    <li>TX-Hash und Contract-Adresse erscheinen</li>
                    <li>Token im {config.name} Explorer sichtbar</li>
                  </ol>
                </div>

                {/* Netzwerk-Info */}
                <div style={{
                  background: isMainnet ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)',
                  border: `1px solid ${isMainnet ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.15)'}`,
                  borderRadius: '12px',
                  padding: '1.2rem',
                }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.8rem', color: isMainnet ? '#fca5a5' : '#93c5fd' }}>
                    {config.name}
                  </h3>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.8' }}>
                    <div>Network ID: <code style={{ color: isMainnet ? '#fca5a5' : '#60a5fa' }}>{config.networkId}</code></div>
                    <div>Adressen: <code style={{ color: isMainnet ? '#fca5a5' : '#60a5fa' }}>{config.addressPrefix}...</code> (44 Zeichen)</div>
                    <div>Currency: <code style={{ color: isMainnet ? '#fca5a5' : '#60a5fa' }}>XCB{isMainnet ? '' : ' (Test)'}</code></div>
                    {!isMainnet && <div>Mining: CPU-Mining via gocore</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Token-Liste (volle Breite) */}
            <TokenList
              refreshTrigger={listRefresh}
              onManageClick={() => setPage('manage')}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div>XCB Smart Contract Web App · Core Coin (XCB) Blockchain · {config.name}</div>
        <div style={{ marginTop: '0.3rem' }}>
          <a href="https://coreblockchain.net" target="_blank" rel="noopener noreferrer"
            style={{ color: '#475569', textDecoration: 'none' }}>
            coreblockchain.net
          </a>
          {' · '}
          <a href={config.explorer} target="_blank" rel="noopener noreferrer"
            style={{ color: '#475569', textDecoration: 'none' }}>
            {isMainnet ? 'blockindex.net' : 'xab.blockindex.net'}
          </a>
        </div>
      </footer>
    </div>
  );
}
