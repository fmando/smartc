// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "./interfaces/ICIP1155.sol";
import "./interfaces/ICIP1155Receiver.sol";

/**
 * @title CIP1155Token – CIP-1155 Multi-Token Standard
 *
 * Hybrid-Contract für fungible und non-fungible Token.
 *
 * Features:
 * - Beliebig viele Token-Typen in einem Contract (ID-basiert)
 * - mint / mintBatch (nur Owner)
 * - burn / burnBatch (Token-Owner oder Operator)
 * - safeTransferFrom / safeBatchTransferFrom mit Receiver-Check
 * - Operator-System (setApprovalForAll)
 * - URI pro Token-Typ (oder globaler Template-URI)
 */
contract CIP1155Token is ICIP1155 {
    address public owner;
    string private _baseUri;

    // tokenId => account => balance
    mapping(uint256 => mapping(address => uint256)) private _balances;
    // account => operator => approved
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    // tokenId => custom URI (leer = _baseUri verwenden)
    mapping(uint256 => string) private _tokenURIs;

    // ============================================================
    // Modifiers
    // ============================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "CIP1155: not owner");
        _;
    }

    // ============================================================
    // Constructor
    // ============================================================

    /**
     * @param uri_ Basis-URI für Metadaten. Kann {id} als Platzhalter enthalten,
     *             z.B. "https://meta.example.com/{id}.json"
     */
    constructor(string memory uri_) {
        _baseUri = uri_;
        owner = msg.sender;
    }

    // ============================================================
    // URI
    // ============================================================

    /**
     * @dev Gibt die URI für Token-Typ `id` zurück.
     * Falls eine individuelle URI gesetzt wurde, wird diese zurückgegeben,
     * sonst die globale Template-URI.
     */
    function uri(uint256 id) external view returns (string memory) {
        string memory customUri = _tokenURIs[id];
        if (bytes(customUri).length > 0) return customUri;
        return _baseUri;
    }

    // ============================================================
    // Balance Queries
    // ============================================================

    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        require(account != address(0), "CIP1155: zero address");
        return _balances[id][account];
    }

    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view override returns (uint256[] memory) {
        require(accounts.length == ids.length, "CIP1155: length mismatch");
        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }
        return batchBalances;
    }

    // ============================================================
    // Approval
    // ============================================================

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "CIP1155: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view override returns (bool) {
        return _operatorApprovals[account][operator];
    }

    // ============================================================
    // Transfer Functions
    // ============================================================

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "CIP1155: not approved");
        require(to != address(0), "CIP1155: transfer to zero address");
        require(_balances[id][from] >= amount, "CIP1155: insufficient balance");

        _balances[id][from] -= amount;
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
        _checkOnReceived(msg.sender, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "CIP1155: not approved");
        require(to != address(0), "CIP1155: transfer to zero address");
        require(ids.length == amounts.length, "CIP1155: length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            require(_balances[ids[i]][from] >= amounts[i], "CIP1155: insufficient balance");
            _balances[ids[i]][from] -= amounts[i];
            _balances[ids[i]][to] += amounts[i];
        }
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _checkOnBatchReceived(msg.sender, from, to, ids, amounts, data);
    }

    // ============================================================
    // Mint
    // ============================================================

    /**
     * @dev Prägt `amount` Token vom Typ `id` an `to`.
     * Setzt optional eine individuelle URI für diesen Token-Typ.
     * Nur Owner.
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        string calldata tokenUri,
        bytes calldata data
    ) external onlyOwner {
        require(to != address(0), "CIP1155: mint to zero address");
        require(amount > 0, "CIP1155: amount must be > 0");

        if (bytes(tokenUri).length > 0) {
            _tokenURIs[id] = tokenUri;
            emit URI(tokenUri, id);
        }

        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
        _checkOnReceived(msg.sender, address(0), to, id, amount, data);
    }

    /**
     * @dev Prägt mehrere Token-Typen auf einmal an `to`. Nur Owner.
     */
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyOwner {
        require(to != address(0), "CIP1155: mint to zero address");
        require(ids.length == amounts.length, "CIP1155: length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            require(amounts[i] > 0, "CIP1155: amount must be > 0");
            _balances[ids[i]][to] += amounts[i];
        }
        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
        _checkOnBatchReceived(msg.sender, address(0), to, ids, amounts, data);
    }

    // ============================================================
    // Burn
    // ============================================================

    function burn(address from, uint256 id, uint256 amount) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "CIP1155: not approved");
        require(_balances[id][from] >= amount, "CIP1155: insufficient balance");
        _balances[id][from] -= amount;
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }

    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "CIP1155: not approved");
        require(ids.length == amounts.length, "CIP1155: length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            require(_balances[ids[i]][from] >= amounts[i], "CIP1155: insufficient balance");
            _balances[ids[i]][from] -= amounts[i];
        }
        emit TransferBatch(msg.sender, from, address(0), ids, amounts);
    }

    // ============================================================
    // Owner: URI setzen
    // ============================================================

    function setTokenURI(uint256 id, string calldata tokenUri) external onlyOwner {
        _tokenURIs[id] = tokenUri;
        emit URI(tokenUri, id);
    }

    // ============================================================
    // Internal: Receiver Check
    // ============================================================

    function _checkOnReceived(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        uint256 size;
        assembly { size := extcodesize(to) }
        if (size > 0) {
            bytes4 retval = ICIP1155Receiver(to).onCIP1155Received(operator, from, id, amount, data);
            require(retval == ICIP1155Receiver.onCIP1155Received.selector, "CIP1155: non-receiver contract");
        }
    }

    function _checkOnBatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal {
        uint256 size;
        assembly { size := extcodesize(to) }
        if (size > 0) {
            bytes4 retval = ICIP1155Receiver(to).onCIP1155BatchReceived(operator, from, ids, amounts, data);
            require(retval == ICIP1155Receiver.onCIP1155BatchReceived.selector, "CIP1155: non-receiver contract");
        }
    }
}
