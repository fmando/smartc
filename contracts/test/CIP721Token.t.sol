// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Test.sol";
import "../src/CIP721Token.sol";
import "../src/interfaces/ICIP721.sol";
import "../src/interfaces/ICIP721Receiver.sol";

// Hilfskontract: gültiger CIP-721 Receiver
contract MockReceiver is ICIP721Receiver {
    bytes4 public lastSelector;
    address public lastOperator;
    address public lastFrom;
    uint256 public lastTokenId;
    bytes public lastData;

    function onCIP721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        lastOperator = operator;
        lastFrom = from;
        lastTokenId = tokenId;
        lastData = data;
        lastSelector = ICIP721Receiver.onCIP721Received.selector;
        return ICIP721Receiver.onCIP721Received.selector;
    }
}

// Hilfskontract: ungültiger Receiver (gibt falschen Selector zurück)
contract BadReceiver is ICIP721Receiver {
    function onCIP721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        return bytes4(0xdeadbeef);
    }
}

// Hilfskontract: Receiver der revert
contract RevertReceiver is ICIP721Receiver {
    function onCIP721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        revert("RevertReceiver: rejected");
    }
}

contract CIP721TokenTest is Test {
    // Event-Deklarationen für vm.expectEmit (ABI-Encoding muss mit Contract übereinstimmen)
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    CIP721Token token;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob   = address(0x3);
    address carol = address(0x4);

    string constant NAME   = "TestNFT";
    string constant SYMBOL = "TNFT";
    string constant URI1   = "https://meta.example.com/1.json";
    string constant URI2   = "https://meta.example.com/2.json";
    string constant URI3   = "https://meta.example.com/3.json";

    function setUp() public {
        vm.prank(owner);
        token = new CIP721Token(NAME, SYMBOL);
    }

    // ============================================================
    // Constructor
    // ============================================================

    function test_constructor_setsName() public {
        assertEq(token.name(), NAME);
    }

    function test_constructor_setsSymbol() public {
        assertEq(token.symbol(), SYMBOL);
    }

    function test_constructor_setsOwner() public {
        assertEq(token.owner(), owner);
    }

    function test_constructor_totalSupplyZero() public {
        assertEq(token.totalSupply(), 0);
    }

    function test_constructor_balanceZero() public {
        assertEq(token.balanceOf(owner), 0);
    }

    // ============================================================
    // Mint
    // ============================================================

    function test_mint_incrementsTokenId() public {
        vm.prank(owner);
        uint256 id = token.mint(alice, URI1);
        assertEq(id, 1);

        vm.prank(owner);
        uint256 id2 = token.mint(alice, URI2);
        assertEq(id2, 2);
    }

    function test_mint_setsOwner() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        assertEq(token.ownerOf(1), alice);
    }

    function test_mint_incrementsBalance() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        assertEq(token.balanceOf(alice), 1);

        vm.prank(owner);
        token.mint(alice, URI2);
        assertEq(token.balanceOf(alice), 2);
    }

    function test_mint_setsTokenURI() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        assertEq(token.tokenURI(1), URI1);
    }

    function test_mint_emitsTransferFromZero() public {
        vm.expectEmit(true, true, true, true);
        emit Transfer(address(0), alice, 1);
        vm.prank(owner);
        token.mint(alice, URI1);
    }

    function test_mint_incrementsTotalSupply() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        assertEq(token.totalSupply(), 1);

        vm.prank(owner);
        token.mint(bob, URI2);
        assertEq(token.totalSupply(), 2);
    }

    function test_mint_revertsNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP721: not owner");
        token.mint(alice, URI1);
    }

    function test_mint_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CIP721: mint to zero address");
        token.mint(address(0), URI1);
    }

    // ============================================================
    // balanceOf / ownerOf
    // ============================================================

    function test_balanceOf_revertsZeroAddress() public {
        vm.expectRevert("CIP721: zero address");
        token.balanceOf(address(0));
    }

    function test_ownerOf_revertsNonexistent() public {
        vm.expectRevert("CIP721: nonexistent token");
        token.ownerOf(99);
    }

    function test_tokenURI_revertsNonexistent() public {
        vm.expectRevert("CIP721: nonexistent token");
        token.tokenURI(99);
    }

    // ============================================================
    // Approve / getApproved
    // ============================================================

    function _mintToken(address to) internal returns (uint256) {
        vm.prank(owner);
        return token.mint(to, URI1);
    }

    function test_approve_setsApproval() public {
        _mintToken(alice);
        vm.prank(alice);
        token.approve(bob, 1);
        assertEq(token.getApproved(1), bob);
    }

    function test_approve_emitsApproval() public {
        _mintToken(alice);
        vm.expectEmit(true, true, true, true);
        emit Approval(alice, bob, 1);
        vm.prank(alice);
        token.approve(bob, 1);
    }

    function test_approve_byOperator() public {
        _mintToken(alice);
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        vm.prank(bob);
        token.approve(carol, 1);
        assertEq(token.getApproved(1), carol);
    }

    function test_approve_revertsCurrentOwner() public {
        _mintToken(alice);
        vm.prank(alice);
        vm.expectRevert("CIP721: approve to current owner");
        token.approve(alice, 1);
    }

    function test_approve_revertsUnauthorized() public {
        _mintToken(alice);
        vm.prank(bob);
        vm.expectRevert("CIP721: not owner nor approved for all");
        token.approve(carol, 1);
    }

    function test_getApproved_revertsNonexistent() public {
        vm.expectRevert("CIP721: nonexistent token");
        token.getApproved(99);
    }

    // ============================================================
    // setApprovalForAll / isApprovedForAll
    // ============================================================

    function test_setApprovalForAll_enables() public {
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        assertTrue(token.isApprovedForAll(alice, bob));
    }

    function test_setApprovalForAll_disables() public {
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        vm.prank(alice);
        token.setApprovalForAll(bob, false);
        assertFalse(token.isApprovedForAll(alice, bob));
    }

    function test_setApprovalForAll_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ApprovalForAll(alice, bob, true);
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
    }

    function test_setApprovalForAll_revertsSelf() public {
        vm.prank(alice);
        vm.expectRevert("CIP721: approve to caller");
        token.setApprovalForAll(alice, true);
    }

    // ============================================================
    // transferFrom
    // ============================================================

    function test_transferFrom_byOwner() public {
        _mintToken(alice);
        vm.prank(alice);
        token.transferFrom(alice, bob, 1);
        assertEq(token.ownerOf(1), bob);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(bob), 1);
    }

    function test_transferFrom_byApproved() public {
        _mintToken(alice);
        vm.prank(alice);
        token.approve(bob, 1);
        vm.prank(bob);
        token.transferFrom(alice, carol, 1);
        assertEq(token.ownerOf(1), carol);
    }

    function test_transferFrom_byOperator() public {
        _mintToken(alice);
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        vm.prank(bob);
        token.transferFrom(alice, carol, 1);
        assertEq(token.ownerOf(1), carol);
    }

    function test_transferFrom_clearsApproval() public {
        _mintToken(alice);
        vm.prank(alice);
        token.approve(bob, 1);
        vm.prank(alice);
        token.transferFrom(alice, carol, 1);
        assertEq(token.getApproved(1), address(0));
    }

    function test_transferFrom_emitsTransfer() public {
        _mintToken(alice);
        vm.expectEmit(true, true, true, true);
        emit Transfer(alice, bob, 1);
        vm.prank(alice);
        token.transferFrom(alice, bob, 1);
    }

    function test_transferFrom_revertsNotApproved() public {
        _mintToken(alice);
        vm.prank(bob);
        vm.expectRevert("CIP721: not approved");
        token.transferFrom(alice, carol, 1);
    }

    function test_transferFrom_revertsWrongFrom() public {
        _mintToken(alice);
        vm.prank(alice);
        vm.expectRevert("CIP721: transfer from incorrect owner");
        token.transferFrom(bob, carol, 1);
    }

    function test_transferFrom_revertsZeroAddressTo() public {
        _mintToken(alice);
        vm.prank(alice);
        vm.expectRevert("CIP721: transfer to zero address");
        token.transferFrom(alice, address(0), 1);
    }

    // ============================================================
    // safeTransferFrom – EOA Empfänger
    // ============================================================

    function test_safeTransferFrom_toEOA() public {
        _mintToken(alice);
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1);
        assertEq(token.ownerOf(1), bob);
    }

    function test_safeTransferFrom_withData_toEOA() public {
        _mintToken(alice);
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1, "extradata");
        assertEq(token.ownerOf(1), bob);
    }

    // ============================================================
    // safeTransferFrom – Contract Empfänger
    // ============================================================

    function test_safeTransferFrom_toValidReceiver() public {
        MockReceiver receiver = new MockReceiver();
        _mintToken(alice);
        vm.prank(alice);
        token.safeTransferFrom(alice, address(receiver), 1);
        assertEq(token.ownerOf(1), address(receiver));
        assertEq(receiver.lastTokenId(), 1);
        assertEq(receiver.lastFrom(), alice);
    }

    function test_safeTransferFrom_toValidReceiver_withData() public {
        MockReceiver receiver = new MockReceiver();
        _mintToken(alice);
        vm.prank(alice);
        token.safeTransferFrom(alice, address(receiver), 1, "mydata");
        assertEq(receiver.lastData(), "mydata");
    }

    function test_safeTransferFrom_rejectsBadReceiver() public {
        BadReceiver bad = new BadReceiver();
        _mintToken(alice);
        vm.prank(alice);
        vm.expectRevert("CIP721: non-receiver contract");
        token.safeTransferFrom(alice, address(bad), 1);
    }

    function test_safeTransferFrom_rejectsRevertReceiver() public {
        RevertReceiver rev = new RevertReceiver();
        _mintToken(alice);
        vm.prank(alice);
        vm.expectRevert("RevertReceiver: rejected");
        token.safeTransferFrom(alice, address(rev), 1);
    }

    // ============================================================
    // Burn
    // ============================================================

    function test_burn_byOwner() public {
        _mintToken(alice);
        vm.prank(alice);
        token.burn(1);
        vm.expectRevert("CIP721: nonexistent token");
        token.ownerOf(1);
    }

    function test_burn_decreasesBalance() public {
        _mintToken(alice);
        vm.prank(alice);
        token.burn(1);
        assertEq(token.balanceOf(alice), 0);
    }

    function test_burn_emitsTransferToZero() public {
        _mintToken(alice);
        vm.expectEmit(true, true, true, true);
        emit Transfer(alice, address(0), 1);
        vm.prank(alice);
        token.burn(1);
    }

    function test_burn_byApproved() public {
        _mintToken(alice);
        vm.prank(alice);
        token.approve(bob, 1);
        vm.prank(bob);
        token.burn(1);
        vm.expectRevert("CIP721: nonexistent token");
        token.ownerOf(1);
    }

    function test_burn_clearsURI() public {
        _mintToken(alice);
        vm.prank(alice);
        token.burn(1);
        vm.expectRevert("CIP721: nonexistent token");
        token.tokenURI(1);
    }

    function test_burn_revertsNotApproved() public {
        _mintToken(alice);
        vm.prank(bob);
        vm.expectRevert("CIP721: not approved");
        token.burn(1);
    }

    // ============================================================
    // Multi-Token Scenario
    // ============================================================

    function test_multiMint_differentOwners() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        vm.prank(owner);
        token.mint(bob, URI2);
        vm.prank(owner);
        token.mint(carol, URI3);

        assertEq(token.ownerOf(1), alice);
        assertEq(token.ownerOf(2), bob);
        assertEq(token.ownerOf(3), carol);
        assertEq(token.totalSupply(), 3);
    }

    function test_transfer_doesNotAffectOtherTokens() public {
        vm.prank(owner);
        token.mint(alice, URI1);
        vm.prank(owner);
        token.mint(alice, URI2);

        vm.prank(alice);
        token.transferFrom(alice, bob, 1);

        assertEq(token.ownerOf(1), bob);
        assertEq(token.ownerOf(2), alice);
        assertEq(token.balanceOf(alice), 1);
        assertEq(token.balanceOf(bob), 1);
    }
}
