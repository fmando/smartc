// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/// @title ICIP20 – CIP-20 Token Standard Interface
/// @notice Interface gemäß https://cip.coreblockchain.net/cip/cbc/cip-20/
/// @dev Analog zu ERC-20, angepasst für Core Coin (XCB) Blockchain
interface ICIP20 {
    /// @notice Gibt die Gesamtmenge der Token zurück
    function totalSupply() external view returns (uint256);

    /// @notice Gibt den Token-Saldo einer Adresse zurück
    /// @param _owner Die Adresse, deren Saldo abgefragt wird
    function balanceOf(address _owner) external view returns (uint256 balance);

    /// @notice Überträgt Token an eine Adresse
    /// @param _to Empfänger-Adresse
    /// @param _value Menge der zu übertragenden Token
    /// @return success true wenn erfolgreich
    function transfer(address _to, uint256 _value) external returns (bool success);

    /// @notice Überträgt Token im Auftrag einer anderen Adresse
    /// @param _from Sender-Adresse (muss Allowance erteilt haben)
    /// @param _to Empfänger-Adresse
    /// @param _value Menge der Token
    /// @return success true wenn erfolgreich
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);

    /// @notice Genehmigt eine Adresse, Token im eigenen Auftrag zu übertragen
    /// @param _spender Die genehmigte Adresse
    /// @param _value Maximale Menge
    /// @return success true wenn erfolgreich
    function approve(address _spender, uint256 _value) external returns (bool success);

    /// @notice Gibt die verbleibende Allowance zurück
    /// @param _owner Token-Eigentümer
    /// @param _spender Genehmigte Adresse
    /// @return remaining Verbleibende Allowance
    function allowance(address _owner, address _spender) external view returns (uint256 remaining);

    /// @notice Wird bei Token-Transfer emittiert
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    /// @notice Wird bei Approve emittiert
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
