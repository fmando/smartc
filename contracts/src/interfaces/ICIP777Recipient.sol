// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/// @title ICIP777Recipient – Hook-Interface für Token-Empfänger
/// @notice Contracts die dieses Interface implementieren erhalten einen Hook bei Token-Empfang
interface ICIP777Recipient {
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
}
