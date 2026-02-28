// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/// @title ICIP102 – CIP-102 Ownership Management Interface
/// @notice Interface gemäß https://cip.coreblockchain.net/cip/cbc/cip-102/
/// @dev Standardisierte Eigentümerschaft für Smart Contracts auf der Core Coin Blockchain
interface ICIP102 {
    /// @notice Wird bei Eigentümerwechsel emittiert
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Gibt die Adresse des aktuellen Eigentümers zurück
    function owner() external view returns (address);

    /// @notice Überträgt die Eigentümerschaft auf eine neue Adresse
    /// @param newOwner Die neue Eigentümer-Adresse
    function transferOwnership(address newOwner) external;

    /// @notice Gibt die Eigentümerschaft dauerhaft auf (setzt owner auf address(0))
    function renounceOwnership() external;
}
