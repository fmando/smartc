/**
 * blockchain.js – XCB Blockchain Service
 *
 * Verwaltet die Verbindung zu testnet und mainnet.
 * Das aktive Netzwerk kann zur Laufzeit über switchNetwork() gewechselt werden.
 *
 * Signing-Modi:
 *   1. DEPLOYER_PRIVATE_KEY → lokales corebc.Wallet (Ed448, 57 Bytes)
 *   2. DEPLOYER_ADDRESS + DEPLOYER_PASSWORD → personal_unlockAccount (nur lokale Nodes)
 */

const corebc = require('corebc');
const path = require('path');
const fs = require('fs');

class BlockchainService {
  constructor() {
    // Beide Netzwerk-Konfigurationen aus .env laden
    this._configs = {
      testnet: {
        rpcUrl:          process.env.TESTNET_RPC_URL || 'http://127.0.0.1:8545',
        networkPrefix:   'ab',
        privateKey:      process.env.TESTNET_DEPLOYER_PRIVATE_KEY || '',
        deployerAddress: process.env.TESTNET_DEPLOYER_ADDRESS || '',
        deployerPassword:process.env.TESTNET_DEPLOYER_PASSWORD || '',
        explorer:        'https://xab.blockindex.net',
        name:            'Devín Testnet',
        networkId:       3,
      },
      mainnet: {
        rpcUrl:          process.env.MAINNET_RPC_URL || '',
        networkPrefix:   'cb',
        privateKey:      process.env.MAINNET_DEPLOYER_PRIVATE_KEY || '',
        deployerAddress: '',
        deployerPassword:'',
        explorer:        'https://blockindex.net',
        name:            'Core Coin Mainnet',
        networkId:       1,
      },
    };

    this.network = process.env.NETWORK || 'testnet';
    this.provider = null;
    this._applyConfig();
  }

  /** Wendet die Konfiguration des aktiven Netzwerks an */
  _applyConfig() {
    const cfg = this._configs[this.network];
    this.rpcUrl        = cfg.rpcUrl;
    this.networkPrefix = cfg.networkPrefix;
    this._initProvider();
  }

  _initProvider() {
    try {
      this.provider = this.rpcUrl
        ? new corebc.JsonRpcProvider(this.rpcUrl)
        : null;
    } catch (err) {
      console.error('[blockchain] Provider init fehler:', err.message);
      this.provider = null;
    }
  }

  /**
   * Wechselt das aktive Netzwerk zur Laufzeit.
   * @param {'testnet'|'mainnet'} network
   */
  switchNetwork(network) {
    if (!this._configs[network]) {
      throw new Error(`Unbekanntes Netzwerk: ${network}. Erlaubt: testnet, mainnet`);
    }
    const cfg = this._configs[network];
    if (!cfg.rpcUrl) {
      throw new Error(`${network.toUpperCase()}_RPC_URL ist nicht in .env konfiguriert`);
    }
    this.network = network;
    this._applyConfig();
    console.log(`[blockchain] Netzwerk gewechselt: ${network} → ${cfg.rpcUrl}`);
  }

  /** Gibt die Konfiguration des aktiven Netzwerks zurück (ohne Secrets) */
  getNetworkConfig() {
    const cfg = this._configs[this.network];
    return {
      name:          cfg.name,
      networkId:     cfg.networkId,
      addressPrefix: cfg.networkPrefix.toUpperCase(),
      explorer:      cfg.explorer,
      rpcUrl:        cfg.rpcUrl,
    };
  }

  /** Gibt an welche Netzwerke konfiguriert sind */
  getAvailableNetworks() {
    return Object.entries(this._configs)
      .filter(([, cfg]) => !!cfg.rpcUrl)
      .map(([key]) => key);
  }

  /**
   * Gibt einen Signer zurück.
   * Modus 1: DEPLOYER_PRIVATE_KEY → lokales Wallet
   * Modus 2: DEPLOYER_ADDRESS + DEPLOYER_PASSWORD → personal_unlockAccount
   */
  async _getSigner() {
    const cfg = this._configs[this.network];

    if (cfg.privateKey) {
      const wallet = new corebc.Wallet({
        key: cfg.privateKey,
        prefix: cfg.networkPrefix,
        provider: this.provider,
      });
      console.log(`[blockchain] Signer: lokales Wallet (${wallet.address.slice(0, 12)}...)`);
      return wallet;
    }

    if (cfg.deployerAddress && cfg.deployerPassword) {
      await this.unlockAccount(cfg.deployerAddress, cfg.deployerPassword, 60);
      const signer = await this.provider.getSigner(cfg.deployerAddress);
      console.log(`[blockchain] Signer: personal_unlockAccount (${cfg.deployerAddress.slice(0, 12)}...)`);
      return signer;
    }

    throw new Error(
      `Kein Signer für ${this.network} konfiguriert. ` +
      `Bitte ${this.network.toUpperCase()}_DEPLOYER_PRIVATE_KEY oder ` +
      `${this.network.toUpperCase()}_DEPLOYER_ADDRESS + _PASSWORD in .env setzen.`
    );
  }

  /** Deployer-Wallet-Adresse und XCB-Balance */
  async getWalletInfo() {
    const cfg = this._configs[this.network];
    let address = cfg.deployerAddress || null;

    // Adresse aus Private Key ableiten (ohne Provider)
    if (!address && cfg.privateKey) {
      try {
        const w = new corebc.Wallet({ key: cfg.privateKey, prefix: cfg.networkPrefix });
        address = w.address;
      } catch {}
    }

    let balance = null;
    let balanceWei = null;
    if (address && this.provider) {
      try {
        const bal = await this.provider.getBalance(address);
        balance    = corebc.formatUnits(bal, 18);
        balanceWei = bal.toString();
      } catch {}
    }

    return { address, balance, balanceWei, network: this.network };
  }

  /** XCB von Deployer-Wallet senden */
  async sendXCB(to, amountXCB) {
    const signer   = await this._getSigner();
    const valueWei = corebc.parseUnits(amountXCB.toString(), 18);
    const tx       = await signer.sendTransaction({ to, value: valueWei });
    const receipt  = await tx.wait(1);
    return {
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      energyUsed:  (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  /**
   * Token-Guthaben einer Adresse abfragen (CIP-20, CIP-777, CIP-721).
   * @param {string} address   – Abzufragende Adresse
   * @param {Array}  deployments – Alle Deployment-Einträge aus deployments.json
   */
  async getTokenBalancesForAddress(address, deployments) {
    const networkDeps = deployments.filter(d => d.network === this.network);

    const queries = networkDeps
      .filter(d => ['CIP-20', 'CIP-777', 'CIP-721'].includes(d.type))
      .map(async (dep) => {
        try {
          const artifactMap = { 'CIP-20': 'CIP20Token', 'CIP-777': 'CIP777Token', 'CIP-721': 'CIP721Token' };
          const { abi } = this.loadContractArtifacts(artifactMap[dep.type]);
          const contract = new corebc.Contract(dep.contractAddress, abi, this.provider);
          const bal      = await contract.balanceOf(address);
          const decimals = dep.type === 'CIP-721' ? 0 : (dep.decimals ?? 18);
          return {
            type:            dep.type,
            name:            dep.name,
            symbol:          dep.symbol,
            contractAddress: dep.contractAddress,
            balance:         dep.type === 'CIP-721' ? bal.toString() : corebc.formatUnits(bal, decimals),
            balanceWei:      bal.toString(),
            decimals,
          };
        } catch { return null; }
      });

    const results = await Promise.allSettled(queries);
    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  }

  /**
   * Token-Transfer vom Deployer-Wallet.
   * CIP-20 nutzt transfer(), CIP-777 nutzt send().
   */
  async transferToken(contractAddress, to, amount, decimals, tokenType) {
    const signer = await this._getSigner();

    if (tokenType === 'CIP-777') {
      const { abi }  = this.loadContractArtifacts('CIP777Token');
      const contract = new corebc.Contract(contractAddress, abi, signer);
      const amountWei = corebc.parseUnits(amount.toString(), 18);
      const tx       = await contract.send(to, amountWei, '0x');
      const receipt  = await tx.wait(1);
      return {
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
        energyUsed:  (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
      };
    } else {
      const { abi }  = this.loadContractArtifacts('CIP20Token');
      const contract = new corebc.Contract(contractAddress, abi, signer);
      const amountWei = corebc.parseUnits(amount.toString(), decimals ?? 18);
      const tx       = await contract.transfer(to, amountWei);
      const receipt  = await tx.wait(1);
      return {
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
        energyUsed:  (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
      };
    }
  }

  async getNodeStatus() {
    try {
      const [blockNumber, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getNetwork(),
      ]);
      return {
        connected: true,
        blockNumber,
        networkId: Number(network.networkId || network.chainId),
        network: this.network,
        rpcUrl: this.rpcUrl,
      };
    } catch (err) {
      return {
        connected: false,
        blockNumber: null,
        networkId: null,
        network: this.network,
        rpcUrl: this.rpcUrl,
        error: err.message,
      };
    }
  }

  async getBalance(address) {
    const balanceWei = await this.provider.getBalance(address);
    const balance = corebc.formatUnits(balanceWei, 18);
    return { address, balance, balanceWei: balanceWei.toString() };
  }

  async unlockAccount(address, password, duration = 60) {
    try {
      const result = await this.provider.send('personal_unlockAccount', [address, password, duration]);
      return result === true;
    } catch (err) {
      throw new Error(`Account-Entsperrung fehlgeschlagen: ${err.message}`);
    }
  }

  loadContractArtifacts(contractName) {
    const artifactsDir = process.env.CONTRACT_ARTIFACTS_DIR || '/root/smartc/contracts/out';
    const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Contract-Artefakte nicht gefunden: ${artifactPath}\n` +
        `Bitte erst 'spark build' in /root/smartc/contracts/ ausführen.`
      );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode.object };
  }

  async deployCIP20Token(params) {
    const { name, symbol, decimals, totalSupply } = params;

    const signer = await this._getSigner();
    const { abi, bytecode } = this.loadContractArtifacts('CIP20Token');
    const totalSupplyWei = corebc.parseUnits(totalSupply.toString(), decimals);

    const factory = new corebc.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(name, symbol, decimals, totalSupplyWei);
    const receipt = await contract.deploymentTransaction().wait(1);

    const signerAddress = typeof signer.getAddress === 'function'
      ? await signer.getAddress()
      : (this._configs[this.network].deployerAddress || '');

    return {
      txHash:          receipt.hash,
      contractAddress: receipt.contractAddress || await contract.getAddress(),
      blockNumber:     receipt.blockNumber,
      deployer:        signerAddress,
      energyUsed:      (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async deployCIP777({ name, symbol, initialSupply, granularity }) {
    const signer = await this._getSigner();
    const { abi, bytecode } = this.loadContractArtifacts('CIP777Token');
    const supplyWei = corebc.parseUnits(initialSupply.toString(), 18);

    const factory = new corebc.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(name, symbol, supplyWei, granularity, []);
    const receipt = await contract.deploymentTransaction().wait(1);

    const signerAddress = typeof signer.getAddress === 'function'
      ? await signer.getAddress()
      : (this._configs[this.network].deployerAddress || '');

    return {
      txHash:          receipt.hash,
      contractAddress: receipt.contractAddress || await contract.getAddress(),
      blockNumber:     receipt.blockNumber,
      deployer:        signerAddress,
      energyUsed:      (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async getCIP777Details(contractAddress) {
    const { abi } = this.loadContractArtifacts('CIP777Token');
    const contract = new corebc.Contract(contractAddress, abi, this.provider);

    const [name, symbol, granularity, totalSupply, owner] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.granularity(),
      contract.totalSupply(),
      contract.owner(),
    ]);

    return {
      address: contractAddress,
      name,
      symbol,
      granularity: Number(granularity),
      totalSupply: corebc.formatUnits(totalSupply, 18),
      totalSupplyWei: totalSupply.toString(),
      owner,
    };
  }

  async deployCIP721({ name, symbol }) {
    const signer = await this._getSigner();
    const { abi, bytecode } = this.loadContractArtifacts('CIP721Token');

    const factory = new corebc.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(name, symbol);
    const receipt = await contract.deploymentTransaction().wait(1);

    const signerAddress = typeof signer.getAddress === 'function'
      ? await signer.getAddress()
      : (this._configs[this.network].deployerAddress || '');

    return {
      txHash:          receipt.hash,
      contractAddress: receipt.contractAddress || await contract.getAddress(),
      blockNumber:     receipt.blockNumber,
      deployer:        signerAddress,
      energyUsed:      (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async mintCIP721(contractAddress, to, uri) {
    const signer = await this._getSigner();
    const { abi } = this.loadContractArtifacts('CIP721Token');
    const contract = new corebc.Contract(contractAddress, abi, signer);

    const tx = await contract.mint(to, uri || '');
    const receipt = await tx.wait(1);

    // TokenId aus Transfer-Event extrahieren (from=address(0) → Mint)
    let tokenId = null;
    try {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
          if (parsed && parsed.name === 'Transfer') {
            tokenId = parsed.args[2].toString();
            break;
          }
        } catch {}
      }
    } catch {}

    return {
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      tokenId,
      energyUsed:  (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async getCIP721Details(contractAddress) {
    const { abi } = this.loadContractArtifacts('CIP721Token');
    const contract = new corebc.Contract(contractAddress, abi, this.provider);

    const [name, symbol, totalSupply, owner] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      contract.owner(),
    ]);

    return {
      address: contractAddress,
      name,
      symbol,
      totalSupply: Number(totalSupply),
      owner,
    };
  }

  async deployCIP1155({ uri }) {
    const signer = await this._getSigner();
    const { abi, bytecode } = this.loadContractArtifacts('CIP1155Token');

    const factory = new corebc.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(uri || '');
    const receipt = await contract.deploymentTransaction().wait(1);

    const signerAddress = typeof signer.getAddress === 'function'
      ? await signer.getAddress()
      : (this._configs[this.network].deployerAddress || '');

    return {
      txHash:          receipt.hash,
      contractAddress: receipt.contractAddress || await contract.getAddress(),
      blockNumber:     receipt.blockNumber,
      deployer:        signerAddress,
      energyUsed:      (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async mintCIP1155(contractAddress, to, id, amount, tokenUri) {
    const signer = await this._getSigner();
    const { abi } = this.loadContractArtifacts('CIP1155Token');
    const contract = new corebc.Contract(contractAddress, abi, signer);

    const tx = await contract.mint(to, id, amount, tokenUri || '', '0x');
    const receipt = await tx.wait(1);

    return {
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      energyUsed:  (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async getCIP1155Details(contractAddress) {
    const { abi } = this.loadContractArtifacts('CIP1155Token');
    const contract = new corebc.Contract(contractAddress, abi, this.provider);

    const [baseUri, owner] = await Promise.all([
      contract.uri(0),
      contract.owner(),
    ]);

    return {
      address: contractAddress,
      uri: baseUri,
      owner,
    };
  }

  async deployCIP102({ label }) {
    const signer = await this._getSigner();
    const { abi, bytecode } = this.loadContractArtifacts('CIP102Ownable');

    const factory = new corebc.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(label);
    const receipt = await contract.deploymentTransaction().wait(1);

    const signerAddress = typeof signer.getAddress === 'function'
      ? await signer.getAddress()
      : (this._configs[this.network].deployerAddress || '');

    return {
      txHash:          receipt.hash,
      contractAddress: receipt.contractAddress || await contract.getAddress(),
      blockNumber:     receipt.blockNumber,
      deployer:        signerAddress,
      energyUsed:      (receipt.energyUsed ?? receipt.gasUsed ?? 0n).toString(),
    };
  }

  async getCIP102Details(contractAddress) {
    const { abi } = this.loadContractArtifacts('CIP102Ownable');
    const contract = new corebc.Contract(contractAddress, abi, this.provider);

    const [owner, label] = await Promise.all([
      contract.owner(),
      contract.label(),
    ]);

    return { address: contractAddress, owner, label };
  }

  async getTokenDetails(contractAddress) {
    const { abi } = this.loadContractArtifacts('CIP20Token');
    const contract = new corebc.Contract(contractAddress, abi, this.provider);

    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      contract.name(), contract.symbol(), contract.decimals(),
      contract.totalSupply(), contract.owner(),
    ]);

    return {
      address: contractAddress,
      name, symbol,
      decimals: Number(decimals),
      totalSupply: corebc.formatUnits(totalSupply, decimals),
      totalSupplyWei: totalSupply.toString(),
      owner,
    };
  }

  async getSyncStatus() {
    try {
      const result = await this.provider.send('xcb_syncing', []);
      if (result === false) {
        return { syncing: false, percent: 100 };
      }
      const current = parseInt(result.currentBlock, 16);
      const highest = parseInt(result.highestBlock, 16);
      const percent = highest > 0 ? Math.floor((current / highest) * 100) : 0;
      return { syncing: true, currentBlock: current, highestBlock: highest, percent };
    } catch {
      return { syncing: false, percent: null };
    }
  }

  async startMining(threads = 1) {
    await this.provider.send('miner_start', [threads]);
  }

  async stopMining() {
    await this.provider.send('miner_stop', []);
  }

  async getMiningStatus() {
    try {
      const [mining, hashrate] = await Promise.all([
        this.provider.send('xcb_mining', []),
        this.provider.send('xcb_hashrate', []),
      ]);
      return { mining, hashrate: parseInt(hashrate, 16) };
    } catch {
      return { mining: false, hashrate: 0 };
    }
  }
}

module.exports = new BlockchainService();
