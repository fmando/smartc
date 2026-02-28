/**
 * CipInfoCard.jsx – Dynamische Info-Karte für den aktiven CIP-Standard
 */

import React from 'react';

const INFO = {
  cip20: {
    color: '#60a5fa',
    bgColor: 'rgba(37,99,235,0.06)',
    borderColor: 'rgba(37,99,235,0.15)',
    title: 'CIP-20 – Fungible Token',
    description:
      'Der Standard-Token auf der XCB Blockchain, analog zu ERC-20 auf Ethereum. ' +
      'Vollständig übertragbar und kompatibel mit XCB-Wallets und Börsen.',
    features: [
      'Transfer, Approve, TransferFrom',
      'Mint (nur Owner) und Burn',
      'Einstellbare Dezimalstellen (0–18)',
      'ICAN-Adressunterstützung (AB/CB)',
    ],
    link: 'https://cip.coreblockchain.net/cip/cbc/cip-20/',
    linkLabel: 'CIP-20 Spezifikation ↗',
  },
  cip777: {
    color: '#a78bfa',
    bgColor: 'rgba(124,58,237,0.06)',
    borderColor: 'rgba(124,58,237,0.15)',
    title: 'CIP-777 – Advanced Fungible Token',
    description:
      'Erweiterter Token mit Operator-System statt approve/allowance. ' +
      'Operatoren können Token im Auftrag des Halters senden und verbrennen – ' +
      'ideal für DeFi, Subscriptions und komplexe Interaktionen.',
    features: [
      'Operatoren statt approve/allowance',
      'Hooks: tokensToSend / tokensReceived',
      'Granularity: Mindest-Transfereinheit',
      'Default-Operatoren konfigurierbar',
    ],
    link: 'https://cip.coreblockchain.net/cip/cbc/cip-777/',
    linkLabel: 'CIP-777 Spezifikation ↗',
  },
  cip721: {
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.15)',
    title: 'CIP-721 – Non-Fungible Token (NFT)',
    description:
      'Einzigartige Token – jeder NFT hat eine eindeutige ID und eine individuelle ' +
      'Metadata-URI. Der Contract-Owner kann beliebig viele NFTs prägen.',
    features: [
      'Auto-inkrementierende Token-IDs (1, 2, 3…)',
      'Individuelle tokenURI pro NFT',
      'safeTransferFrom mit Receiver-Check',
      'Operator-System (setApprovalForAll)',
    ],
    link: 'https://cip.coreblockchain.net/cip/cbc/cip-721/',
    linkLabel: 'CIP-721 Spezifikation ↗',
  },
  cip1155: {
    color: '#fb923c',
    bgColor: 'rgba(234,88,12,0.06)',
    borderColor: 'rgba(234,88,12,0.15)',
    title: 'CIP-1155 – Multi-Token Standard',
    description:
      'Ein einziger Contract verwaltet beliebig viele Token-Typen – fungible und ' +
      'non-fungible. Jeder Typ hat eine eigene ID und kann in beliebiger Menge geprägt werden.',
    features: [
      'Fungible + NFTs in einem Contract',
      'mint / mintBatch für Massen-Prägung',
      'Individuelle URI pro Token-Typ',
      'Operator-System (setApprovalForAll)',
    ],
    link: 'https://cip.coreblockchain.net/cip/cbc/cip-1155/',
    linkLabel: 'CIP-1155 Spezifikation ↗',
  },
};

export default function CipInfoCard({ tab }) {
  const info = INFO[tab] || INFO.cip20;

  return (
    <div style={{
      background: info.bgColor,
      border: `1px solid ${info.borderColor}`,
      borderRadius: '12px',
      padding: '1.2rem',
      transition: 'all 0.2s',
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.8rem', color: info.color }}>
        {info.title}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '0.7rem' }}>
        {info.description}
      </p>
      <ul style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.9', paddingLeft: '1.2rem', marginBottom: '0.8rem' }}>
        {info.features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      <a
        href={info.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: info.color, textDecoration: 'none', fontSize: '0.82rem' }}
      >
        {info.linkLabel}
      </a>
    </div>
  );
}
