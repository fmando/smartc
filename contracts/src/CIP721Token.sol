// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "./interfaces/ICIP721.sol";
import "./interfaces/ICIP721Receiver.sol";

/**
 * @title CIP721Token – CIP-721 Non-Fungible Token
 *
 * NFT-Contract nach CIP-721 Standard.
 *
 * Features:
 * - Einzigartige Token (tokenId 1, 2, 3, ...)
 * - tokenURI pro Token (Metadata-Link)
 * - Operator-System (approve / setApprovalForAll)
 * - safeTransferFrom mit Receiver-Check
 * - mint() nur durch Owner
 * - burn() durch Token-Owner oder Approved
 */
contract CIP721Token is ICIP721 {
    string public name;
    string public symbol;
    address public owner;

    uint256 private _tokenIdCounter;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    // ============================================================
    // Modifiers
    // ============================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "CIP721: not owner");
        _;
    }

    // ============================================================
    // Constructor
    // ============================================================

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
    }

    // ============================================================
    // View Functions
    // ============================================================

    function balanceOf(address tokenOwner) external view override returns (uint256) {
        require(tokenOwner != address(0), "CIP721: zero address");
        return _balances[tokenOwner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "CIP721: nonexistent token");
        return tokenOwner;
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_owners[tokenId] != address(0), "CIP721: nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address tokenOwner, address operator) public view override returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(_owners[tokenId] != address(0), "CIP721: nonexistent token");
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ============================================================
    // Approval Functions
    // ============================================================

    function approve(address to, uint256 tokenId) external override {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "CIP721: approve to current owner");
        require(
            msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender),
            "CIP721: not owner nor approved for all"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "CIP721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ============================================================
    // Transfer Functions
    // ============================================================

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "CIP721: not approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "CIP721: not approved");
        _transfer(from, to, tokenId);
        _checkReceiver(msg.sender, from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "CIP721: not approved");
        _transfer(from, to, tokenId);
        _checkReceiver(msg.sender, from, to, tokenId, data);
    }

    // ============================================================
    // Mint / Burn
    // ============================================================

    /**
     * @dev Mintet einen neuen NFT an `to` mit URI `uri`.
     * Nur der Contract-Owner kann minten.
     * @return tokenId Die ID des neuen Tokens (auto-increment ab 1).
     */
    function mint(address to, string calldata uri) external onlyOwner returns (uint256) {
        require(to != address(0), "CIP721: mint to zero address");
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = uri;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    /**
     * @dev Verbrennt Token `tokenId`. Nur Owner oder Approved.
     */
    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "CIP721: not approved");
        address tokenOwner = ownerOf(tokenId);
        delete _tokenApprovals[tokenId];
        _balances[tokenOwner]--;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        emit Transfer(tokenOwner, address(0), tokenId);
    }

    // ============================================================
    // Internal Functions
    // ============================================================

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (
            spender == tokenOwner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(tokenOwner, spender)
        );
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "CIP721: transfer from incorrect owner");
        require(to != address(0), "CIP721: transfer to zero address");
        delete _tokenApprovals[tokenId];
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _checkReceiver(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        uint256 size;
        assembly { size := extcodesize(to) }
        if (size > 0) {
            bytes4 retval = ICIP721Receiver(to).onCIP721Received(operator, from, tokenId, data);
            require(retval == ICIP721Receiver.onCIP721Received.selector, "CIP721: non-receiver contract");
        }
    }
}
