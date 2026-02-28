// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/// @title ICIP777 – CIP-777 Advanced Fungible Token Interface
/// @notice Interface gemäß https://cip.coreblockchain.net/cip/cbc/cip-777/
/// @dev Erweiterter Token-Standard mit Operator-Mechanismus und Hooks
interface ICIP777 {

    // ========== Events ==========

    event Sent(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event Minted(
        address indexed operator,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event Burned(
        address indexed operator,
        address indexed from,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);

    // ========== View Functions ==========

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function granularity() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function defaultOperators() external view returns (address[] memory);
    function isOperatorFor(address operator, address tokenHolder) external view returns (bool);

    // ========== Token Operations ==========

    function send(address to, uint256 amount, bytes calldata data) external;
    function burn(uint256 amount, bytes calldata data) external;

    // ========== Operator Operations ==========

    function authorizeOperator(address operator) external;
    function revokeOperator(address operator) external;
    function operatorSend(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
    function operatorBurn(
        address from,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
}
