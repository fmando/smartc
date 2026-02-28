// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/**
 * @title ICIP1155Receiver – Callback-Interface für CIP-1155 Token-Empfang
 *
 * Contracts die CIP-1155 Token per safeTransferFrom empfangen wollen,
 * müssen dieses Interface implementieren.
 */
interface ICIP1155Receiver {
    /**
     * @dev Wird nach CIP-1155 safeTransferFrom aufgerufen (einzelner Token).
     * @return bytes4 Muss `ICIP1155Receiver.onCIP1155Received.selector` zurückgeben.
     */
    function onCIP1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    /**
     * @dev Wird nach CIP-1155 safeBatchTransferFrom aufgerufen (mehrere Token).
     * @return bytes4 Muss `ICIP1155Receiver.onCIP1155BatchReceived.selector` zurückgeben.
     */
    function onCIP1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}
