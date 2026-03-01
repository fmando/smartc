/**
 * db.js – SQLite-Datenbankservice (better-sqlite3)
 *
 * Zentraler Ersatz für alle lokalen JSON-Funktionen in den Route-Dateien.
 * DB-Pfad: backend/data/smartc.db (via DB_PATH env oder Default)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/smartc.db');
const DEPLOYMENTS_JSON = path.join(__dirname, '../../data/deployments.json');

// Verzeichnis sicherstellen
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// WAL-Modus für bessere Concurrency
db.pragma('journal_mode = WAL');

// ============================================================
// Schema
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS deployments (
    id               TEXT PRIMARY KEY,
    type             TEXT NOT NULL,
    contractAddress  TEXT NOT NULL,
    txHash           TEXT NOT NULL,
    blockNumber      INTEGER,
    deployer         TEXT,
    energyUsed       TEXT,
    network          TEXT NOT NULL,
    timestamp        TEXT NOT NULL,
    name             TEXT,
    symbol           TEXT,
    decimals         INTEGER,
    totalSupply      TEXT,
    initialSupply    TEXT,
    granularity      INTEGER,
    uri              TEXT,
    label            TEXT,
    verified         INTEGER NOT NULL DEFAULT 0,
    verifiedAt       TEXT,
    verifyError      TEXT,
    abi              TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_network ON deployments(network);
  CREATE INDEX IF NOT EXISTS idx_addr    ON deployments(contractAddress);
`);

// ============================================================
// Migration: deployments.json → SQLite (einmalig)
// ============================================================
function migrate() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM deployments').get();
  if (countRow.cnt > 0) return; // DB hat bereits Daten

  if (!fs.existsSync(DEPLOYMENTS_JSON)) return;

  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(DEPLOYMENTS_JSON, 'utf8'));
  } catch {
    return;
  }

  if (!Array.isArray(entries) || entries.length === 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO deployments
      (id, type, contractAddress, txHash, blockNumber, deployer, energyUsed,
       network, timestamp, name, symbol, decimals, totalSupply, initialSupply,
       granularity, uri, label, verified, verifiedAt, verifyError, abi)
    VALUES
      (@id, @type, @contractAddress, @txHash, @blockNumber, @deployer, @energyUsed,
       @network, @timestamp, @name, @symbol, @decimals, @totalSupply, @initialSupply,
       @granularity, @uri, @label, 0, NULL, NULL, NULL)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        id:              row.id || Date.now().toString(),
        type:            row.type || 'CIP-20',
        contractAddress: row.contractAddress || '',
        txHash:          row.txHash || '',
        blockNumber:     row.blockNumber ?? null,
        deployer:        row.deployer ?? null,
        energyUsed:      row.energyUsed ?? null,
        network:         row.network || 'testnet',
        timestamp:       row.timestamp || new Date().toISOString(),
        name:            row.name ?? null,
        symbol:          row.symbol ?? null,
        decimals:        row.decimals ?? null,
        totalSupply:     row.totalSupply ?? null,
        initialSupply:   row.initialSupply ?? null,
        granularity:     row.granularity ?? null,
        uri:             row.uri ?? null,
        label:           row.label ?? null,
      });
    }
  });

  insertMany(entries);
  console.log(`[db] Migration: ${entries.length} Einträge aus deployments.json importiert.`);

  // Datei umbenennen damit Migration nicht erneut läuft
  try {
    fs.renameSync(DEPLOYMENTS_JSON, DEPLOYMENTS_JSON + '.migrated');
  } catch (e) {
    console.warn('[db] Konnte deployments.json nicht umbenennen:', e.message);
  }
}

migrate();

// ============================================================
// Öffentliche API
// ============================================================

const stmtInsert = db.prepare(`
  INSERT OR REPLACE INTO deployments
    (id, type, contractAddress, txHash, blockNumber, deployer, energyUsed,
     network, timestamp, name, symbol, decimals, totalSupply, initialSupply,
     granularity, uri, label, verified, verifiedAt, verifyError, abi)
  VALUES
    (@id, @type, @contractAddress, @txHash, @blockNumber, @deployer, @energyUsed,
     @network, @timestamp, @name, @symbol, @decimals, @totalSupply, @initialSupply,
     @granularity, @uri, @label,
     COALESCE((SELECT verified FROM deployments WHERE id = @id), 0),
     (SELECT verifiedAt FROM deployments WHERE id = @id),
     (SELECT verifyError FROM deployments WHERE id = @id),
     (SELECT abi FROM deployments WHERE id = @id))
`);

function saveDeployment(dep) {
  stmtInsert.run({
    id:              dep.id || Date.now().toString(),
    type:            dep.type || 'CIP-20',
    contractAddress: dep.contractAddress || '',
    txHash:          dep.txHash || '',
    blockNumber:     dep.blockNumber ?? null,
    deployer:        dep.deployer ?? null,
    energyUsed:      dep.energyUsed ?? null,
    network:         dep.network || 'testnet',
    timestamp:       dep.timestamp || new Date().toISOString(),
    name:            dep.name ?? null,
    symbol:          dep.symbol ?? null,
    decimals:        dep.decimals ?? null,
    totalSupply:     dep.totalSupply ?? null,
    initialSupply:   dep.initialSupply ?? null,
    granularity:     dep.granularity ?? null,
    uri:             dep.uri ?? null,
    label:           dep.label ?? null,
  });
}

const stmtAll = db.prepare(
  'SELECT * FROM deployments ORDER BY timestamp DESC'
);

function loadDeployments() {
  return stmtAll.all().map(rowToObject);
}

const stmtByAddr = db.prepare(
  'SELECT * FROM deployments WHERE LOWER(contractAddress) = LOWER(?)'
);

function getDeployment(contractAddress) {
  const row = stmtByAddr.get(contractAddress);
  return row ? rowToObject(row) : null;
}

const stmtSetVerified = db.prepare(
  'UPDATE deployments SET verified = ?, verifiedAt = ?, verifyError = ? WHERE LOWER(contractAddress) = LOWER(?)'
);

function setVerified(contractAddress, status, errorMsg) {
  stmtSetVerified.run(
    status,
    status === 1 ? new Date().toISOString() : null,
    errorMsg ?? null,
    contractAddress
  );
}

const stmtSetAbi = db.prepare(
  'UPDATE deployments SET abi = ? WHERE LOWER(contractAddress) = LOWER(?)'
);

function setAbi(contractAddress, abi) {
  const abiStr = typeof abi === 'string' ? abi : JSON.stringify(abi);
  stmtSetAbi.run(abiStr, contractAddress);
}

// Konvertiert SQLite-Zeile zurück in JS-Objekt (abi als geparster Array)
function rowToObject(row) {
  if (!row) return null;
  return {
    ...row,
    abi: row.abi ? (() => { try { return JSON.parse(row.abi); } catch { return row.abi; } })() : undefined,
  };
}

module.exports = { saveDeployment, loadDeployments, getDeployment, setVerified, setAbi };
