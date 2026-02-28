// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

/**
 * @title ICIP721 – CIP-721 Non-Fungible Token Standard Interface
 *
 * Standard für einzigartige (non-fungible) Token auf der XCB Blockchain.
 */
interface ICIP721 {
    // ============================================================
    // Events
    // ============================================================

    /// @dev Emitted when `tokenId` is transferred from `from` to `to`.
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /// @dev Emitted when `owner` approves `approved` to manage `tokenId`.
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /// @dev Emitted when `owner` enables/disables `operator` for all tokens.
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ============================================================
    // Functions
    // ============================================================

    /// @dev Returns the number of tokens owned by `owner`.
    function balanceOf(address owner) external view returns (uint256);

    /// @dev Returns the owner of `tokenId`.
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @dev Approves `to` to transfer `tokenId`.
    function approve(address to, uint256 tokenId) external;

    /// @dev Returns the approved address for `tokenId`.
    function getApproved(uint256 tokenId) external view returns (address);

    /// @dev Enables/disables `operator` to manage all tokens of `msg.sender`.
    function setApprovalForAll(address operator, bool approved) external;

    /// @dev Returns true if `operator` is approved for all tokens of `owner`.
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    /// @dev Transfers `tokenId` from `from` to `to`.
    function transferFrom(address from, address to, uint256 tokenId) external;

    /// @dev Safely transfers `tokenId` from `from` to `to`.
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    /// @dev Safely transfers `tokenId` from `from` to `to` with additional data.
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    /// @dev Returns the URI for `tokenId` metadata.
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
