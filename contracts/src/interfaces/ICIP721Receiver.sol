// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/**
 * @title ICIP721Receiver – Callback-Interface für CIP-721 Token-Empfang
 *
 * Contracts die CIP-721 Token per safeTransferFrom empfangen wollen,
 * müssen dieses Interface implementieren.
 */
interface ICIP721Receiver {
    /**
     * @dev Wird nach CIP-721 safeTransferFrom aufgerufen.
     * @return bytes4 Muss `ICIP721Receiver.onCIP721Received.selector` zurückgeben.
     */
    function onCIP721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
