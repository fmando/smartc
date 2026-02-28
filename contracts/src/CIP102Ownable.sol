// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "./interfaces/ICIP102.sol";

/// @title CIP102Ownable – CIP-102 Ownership Management Contract
/// @notice Standalone Ownership-Management-Contract auf der Core Coin (XCB) Blockchain
/// @dev Implementiert den CIP-102 Standard (https://cip.coreblockchain.net/cip/cbc/cip-102/)
/// @custom:network Core Coin XCB Blockchain
contract CIP102Ownable is ICIP102 {
    // ========== State Variables ==========

    address private _owner;
    string public label;

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(_owner == msg.sender, "CIP102: caller is not the owner");
        _;
    }

    // ========== Constructor ==========

    /// @notice Erstellt einen neuen CIP-102 Ownable Contract
    /// @param _label Beschriftung / Name dieses Ownership-Contracts
    constructor(string memory _label) {
        require(bytes(_label).length > 0, "CIP102: label cannot be empty");
        label = _label;
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ========== CIP-102 Standard Functions ==========

    /// @notice Gibt die Adresse des aktuellen Eigentümers zurück
    function owner() public view override returns (address) {
        return _owner;
    }

    /// @notice Überträgt die Eigentümerschaft auf eine neue Adresse
    /// @param newOwner Die neue Eigentümer-Adresse (darf nicht address(0) sein)
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "CIP102: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    /// @notice Gibt die Eigentümerschaft dauerhaft auf
    /// @dev Setzt owner auf address(0) – nicht umkehrbar!
    function renounceOwnership() public override onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}
