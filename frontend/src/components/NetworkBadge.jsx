/**
 * NetworkBadge.jsx – Netzwerk-Status und Umschalter
 *
 * Zeigt:
 * - Aktuelles Netzwerk (Testnet/Mainnet) mit Switch-Button
 * - Node-Verbindungsstatus und Blocknummer
 * - Mining-Status
 * - Explorer-Link
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getHealth, switchNetwork, startMining, stopMining } from '../services/api.js';

const styles = {
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    flexWrap: 'wrap',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  dot: (color) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    flexShrink: 0,
  }),
  networkLabel: (network) => ({
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.8rem',
    background: network === 'mainnet' ? '#dc2626' : '#2563eb',
    color: 'white',
  }),
  switchBtn: (target) => ({
    padding: '2px 8px',
    borderRadius: '4px',
    border: `1px solid ${target === 'mainnet' ? 'rgba(220,38,38,0.5)' : 'rgba(37,99,235,0.5)'}`,
    background: 'transparent',
    color: target === 'mainnet' ? '#fca5a5' : '#93c5fd',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  muted: { color: '#94a3b8' },

  // Bestätigungs-Overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1e293b',
    border: '1px solid rgba(220,38,38,0.4)',
    borderRadius: '12px',
    padding: '1.5rem',
    maxWidth: '420px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fca5a5',
    marginBottom: '0.8rem',
  },
  modalText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    marginBottom: '1.2rem',
  },
  modalButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  confirmBtn: {
    flex: 1,
    padding: '0.7rem',
    background: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  cancelBtn: {
    padding: '0.7rem 1.2rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};

export default function NetworkBadge({ onNetworkChange }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [confirmMainnet, setConfirmMainnet] = useState(false);
  const [miningToggling, setMiningToggling] = useState(false);
  const [miningThreads, setMiningThreads] = useState(1);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const network = health?.network || 'testnet';
  const targetNetwork = network === 'mainnet' ? 'testnet' : 'mainnet';

  async function doSwitch() {
    setSwitching(true);
    setConfirmMainnet(false);
    try {
      await switchNetwork(targetNetwork);
      // Health sofort aktualisieren
      await fetchHealth();
      // App informieren (App.jsx lädt networkInfo neu)
      onNetworkChange?.();
    } catch (err) {
      alert(`Netzwerk-Wechsel fehlgeschlagen:\n${err.message}`);
    } finally {
      setSwitching(false);
    }
  }

  async function handleMiningToggle() {
    setMiningToggling(true);
    try {
      if (mining) {
        await stopMining();
      } else {
        await startMining(miningThreads);
      }
      await fetchHealth();
    } catch (err) {
      alert(`Mining-Umschalten fehlgeschlagen:\n${err.message}`);
    } finally {
      setMiningToggling(false);
    }
  }

  function handleSwitchClick() {
    // Wechsel zu Mainnet: Bestätigung anfordern
    if (targetNetwork === 'mainnet') {
      setConfirmMainnet(true);
    } else {
      doSwitch();
    }
  }

  if (loading) {
    return (
      <div style={styles.badge}>
        <span style={styles.muted}>Verbinde mit Node...</span>
      </div>
    );
  }

  const connected = health?.node?.connected === true;
  const blockNumber = health?.node?.blockNumber;
  const mining = health?.mining?.mining;
  const sync = health?.sync;

  return (
    <>
      <div style={styles.badge}>
        {/* Netzwerk-Label */}
        <div style={styles.item}>
          <span style={styles.networkLabel(network)}>
            {network === 'mainnet' ? 'MAINNET' : 'TESTNET (Devín)'}
          </span>
        </div>

        {/* Switch-Button */}
        <div style={styles.item}>
          <button
            style={styles.switchBtn(targetNetwork)}
            onClick={handleSwitchClick}
            disabled={switching}
            title={`Zu ${targetNetwork} wechseln`}
          >
            {switching ? '...' : `⇄ ${targetNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}`}
          </button>
        </div>

        {/* Node-Status + Sync */}
        <div style={styles.item}>
          <span style={styles.dot(connected ? '#22c55e' : '#ef4444')} />
          <span style={{ color: connected ? '#22c55e' : '#ef4444' }}>
            {connected ? 'Node verbunden' : 'Node nicht erreichbar'}
          </span>
          {connected && sync?.percent != null && (
            <span style={{
              color: sync.percent === 100 ? '#22c55e' : '#f59e0b',
              fontWeight: '600',
              marginLeft: '0.2rem',
            }}>
              {sync.percent === 100 ? '100% ✓' : `${sync.percent}%`}
            </span>
          )}
        </div>

        {/* Blocknummer */}
        {connected && blockNumber != null && (
          <div style={styles.item}>
            <span style={styles.muted}>Block:</span>
            <span style={{ fontFamily: 'monospace' }}>#{blockNumber.toLocaleString()}</span>
          </div>
        )}

        {/* Mining Toggle + Thread-Auswahl */}
        {connected && (
          <div style={styles.item}>
            <button
              onClick={handleMiningToggle}
              disabled={miningToggling}
              title={mining ? 'Mining stoppen' : `Mining starten (${miningThreads} Core${miningThreads > 1 ? 's' : ''})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '2px 8px',
                borderRadius: '4px 0 0 4px',
                border: `1px solid ${mining ? 'rgba(245,158,11,0.4)' : 'rgba(71,85,105,0.4)'}`,
                borderRight: 'none',
                background: 'transparent',
                color: mining ? '#f59e0b' : '#64748b',
                fontSize: '0.8rem',
                cursor: miningToggling ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: miningToggling ? 0.6 : 1,
              }}
            >
              <span style={styles.dot(mining ? '#f59e0b' : '#475569')} />
              {miningToggling ? '...' : mining ? 'Mining an' : 'Mining aus'}
            </button>
            <select
              value={miningThreads}
              onChange={(e) => setMiningThreads(Number(e.target.value))}
              disabled={mining || miningToggling}
              title="Anzahl CPU-Cores für Mining"
              style={{
                padding: '2px 4px',
                borderRadius: '0 4px 4px 0',
                border: `1px solid ${mining ? 'rgba(245,158,11,0.4)' : 'rgba(71,85,105,0.4)'}`,
                background: 'rgba(255,255,255,0.05)',
                color: mining ? '#f59e0b' : '#64748b',
                fontSize: '0.8rem',
                cursor: mining ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              {[1, 2, 3, 4, 6].map((n) => (
                <option key={n} value={n} style={{ background: '#1e293b' }}>{n}C</option>
              ))}
            </select>
          </div>
        )}

        {/* Explorer Link */}
        {connected && (
          <div style={styles.item}>
            <a
              href={health?.explorer || 'https://xab.blockindex.net'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.8rem' }}
            >
              Explorer ↗
            </a>
          </div>
        )}
      </div>

      {/* Mainnet-Bestätigungsdialog */}
      {confirmMainnet && (
        <div style={styles.overlay} onClick={() => setConfirmMainnet(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Zu Mainnet wechseln?</div>
            <div style={styles.modalText}>
              Du wechselst auf das <strong style={{ color: '#fca5a5' }}>Core Coin Mainnet</strong>.
              <br /><br />
              Deployments kosten danach <strong>echtes XCB</strong>. Stelle sicher, dass das
              Deployer-Wallet aufgeladen ist und der Private Key in der Server-Konfiguration hinterlegt ist.
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.confirmBtn} onClick={doSwitch}>
                Ja, zu Mainnet wechseln
              </button>
              <button style={styles.cancelBtn} onClick={() => setConfirmMainnet(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
