// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/// @title ICIP777Sender – Hook-Interface für Token-Sender
/// @notice Contracts die dieses Interface implementieren erhalten einen Hook vor dem Senden
interface ICIP777Sender {
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
}
