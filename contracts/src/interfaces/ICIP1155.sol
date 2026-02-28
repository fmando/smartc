// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/**
 * @title ICIP1155 – CIP-1155 Multi-Token Standard Interface
 *
 * Hybrid-Standard für fungible und non-fungible Token in einem Contract.
 * Jeder Token-Typ hat eine eindeutige uint256 ID.
 */
interface ICIP1155 {
    // ============================================================
    // Events
    // ============================================================

    /// @dev Emitted on single token transfer (including mint from address(0) and burn to address(0)).
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    /// @dev Emitted on batch token transfer.
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /// @dev Emitted when `account` grants or revokes operator status for `operator`.
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    /// @dev Emitted when the URI for a token type changes.
    event URI(string value, uint256 indexed id);

    // ============================================================
    // Functions
    // ============================================================

    /// @dev Returns the amount of `id` tokens owned by `account`.
    function balanceOf(address account, uint256 id) external view returns (uint256);

    /// @dev Batch-version of balanceOf. accounts[i] and ids[i] must have equal length.
    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory);

    /// @dev Grants or revokes permission for `operator` to transfer all tokens.
    function setApprovalForAll(address operator, bool approved) external;

    /// @dev Returns true if `operator` is approved to manage all tokens of `account`.
    function isApprovedForAll(address account, address operator) external view returns (bool);

    /// @dev Transfers `amount` tokens of type `id` from `from` to `to`.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    /// @dev Batch-transfers of multiple token types from `from` to `to`.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;
}
