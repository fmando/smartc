/**
 * compiler.js – Contract Kompilierungs-Service
 *
 * Hilfsfunktionen rund um Contract-Artefakte und Kompilierung.
 * Die eigentliche Kompilierung läuft via Foxar (spark build).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CompilerService {
  constructor() {
    this.contractsDir = '/root/smartc/contracts';
    this.artifactsDir = path.join(this.contractsDir, 'out');
  }

  /**
   * Prüft ob Foxar (spark) installiert ist
   * @returns {boolean}
   */
  isFoxarAvailable() {
    try {
      execSync('spark --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Führt spark build aus
   * @returns {{success: boolean, output: string, error: string|null}}
   */
  buildContracts() {
    try {
      const output = execSync('spark build', {
        cwd: this.contractsDir,
        stdio: 'pipe',
        timeout: 120000,
      }).toString();
      return { success: true, output, error: null };
    } catch (err) {
      return {
        success: false,
        output: err.stdout?.toString() || '',
        error: err.stderr?.toString() || err.message,
      };
    }
  }

  /**
   * Prüft ob kompilierte Artefakte vorhanden sind
   * @param {string} contractName
   * @returns {boolean}
   */
  artifactsExist(contractName) {
    const artifactPath = path.join(
      this.artifactsDir,
      `${contractName}.sol`,
      `${contractName}.json`
    );
    return fs.existsSync(artifactPath);
  }

  /**
   * Gibt Infos über verfügbare Contracts zurück
   * @returns {Array<{name: string, hasArtifacts: boolean}>}
   */
  getContractInfo() {
    const contracts = ['CIP20Token'];
    return contracts.map((name) => ({
      name,
      hasArtifacts: this.artifactsExist(name),
      artifactPath: path.join(this.artifactsDir, `${name}.sol`, `${name}.json`),
    }));
  }

  /**
   * Führt spark test aus
   * @returns {{success: boolean, output: string}}
   */
  runTests() {
    try {
      const output = execSync('spark test -v', {
        cwd: this.contractsDir,
        stdio: 'pipe',
        timeout: 300000,
      }).toString();
      return { success: true, output };
    } catch (err) {
      return {
        success: false,
        output: err.stdout?.toString() || '',
        error: err.stderr?.toString() || err.message,
      };
    }
  }
}

module.exports = new CompilerService();
