/**
 * verifier.js – Contract-Verifikation via spark verify-contract
 *
 * Führt Verifikation asynchron (fire-and-forget) aus.
 * Setzt Verifikationsstatus in der DB.
 */

const { exec } = require('child_process');
const corebc = require('corebc');
const db = require('./db');

const CONTRACTS_DIR = '/root/smartc/contracts';

const CONTRACT_REF = {
  'CIP-20':   'src/CIP20Token.sol:CIP20Token',
  'CIP-777':  'src/CIP777Token.sol:CIP777Token',
  'CIP-721':  'src/CIP721Token.sol:CIP721Token',
  'CIP-1155': 'src/CIP1155Token.sol:CIP1155Token',
  'CIP-102':  'src/CIP102Ownable.sol:CIP102Ownable',
};

/**
 * ABI-kodiert die Constructor-Argumente eines Deployments.
 * Gibt den Hex-String zurück (mit 0x-Prefix) oder null bei Fehler.
 */
function buildConstructorArgs(dep) {
  const coder = new corebc.AbiCoder();
  try {
    switch (dep.type) {
      case 'CIP-20':
        return coder.encode(
          ['string', 'string', 'uint8', 'uint256'],
          [dep.name || '', dep.symbol || '', dep.decimals ?? 18,
           corebc.parseUnits((dep.totalSupply || '0').toString(), dep.decimals ?? 18)]
        );
      case 'CIP-777':
        return coder.encode(
          ['string', 'string', 'uint256', 'uint256', 'address[]'],
          [dep.name || '', dep.symbol || '',
           corebc.parseUnits((dep.initialSupply || '0').toString(), 18),
           dep.granularity ?? 1, []]
        );
      case 'CIP-721':
        return coder.encode(
          ['string', 'string'],
          [dep.name || '', dep.symbol || '']
        );
      case 'CIP-1155':
        return coder.encode(
          ['string'],
          [dep.uri || '']
        );
      default:
        return null;
    }
  } catch (e) {
    console.warn(`[verifier] ABI-Encode fehlgeschlagen für ${dep.type}:`, e.message);
    return null;
  }
}

/**
 * Startet Verifikation asynchron und aktualisiert den DB-Status.
 * @param {string} address       – Contract-Adresse
 * @param {string} cipType       – z.B. 'CIP-20'
 * @param {string} network       – 'testnet' | 'mainnet'
 */
function verifyContractAsync(address, cipType, network) {
  const contractRef = CONTRACT_REF[cipType];
  if (!contractRef) {
    console.warn(`[verifier] Kein Contract-Ref für Typ "${cipType}" – überspringe.`);
    return;
  }

  const dep = db.getDeployment(address);
  const constructorArgs = dep ? buildConstructorArgs(dep) : null;

  const network_flag = network === 'mainnet' ? 'mainnet' : 'devin';
  const cmdParts = [
    '/root/.foxar/bin/spark verify-contract',
    `-n ${network_flag}`,
  ];
  if (constructorArgs) {
    cmdParts.push(`--constructor-args ${constructorArgs}`);
  }
  cmdParts.push(address, `"${contractRef}"`);
  const cmd = cmdParts.join(' ');

  console.log(`[verifier] Starte Verifikation für ${address} (${cipType}, ${network_flag})`);
  if (constructorArgs) {
    console.log(`[verifier] Constructor-Args: ${constructorArgs.slice(0, 80)}...`);
  }

  exec(cmd, { cwd: CONTRACTS_DIR, timeout: 120000 }, (error, stdout, stderr) => {
    if (error) {
      const errMsg = (stderr || error.message || '').slice(0, 500);
      console.warn(`[verifier] Verifikation fehlgeschlagen für ${address}: ${errMsg}`);
      db.setVerified(address, 2, errMsg);
    } else {
      console.log(`[verifier] Verifikation erfolgreich für ${address}`);
      db.setVerified(address, 1, null);
    }
  });
}

/**
 * Setzt Verifikationsstatus zurück auf "pending" und startet neu.
 * @param {string} address – Contract-Adresse
 */
function retriggerVerification(address) {
  const dep = db.getDeployment(address);
  if (!dep) return false;

  db.setVerified(address, 0, null);
  verifyContractAsync(address, dep.type, dep.network);
  return true;
}

module.exports = { verifyContractAsync, retriggerVerification };
