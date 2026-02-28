// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Test.sol";
import "../src/CIP1155Token.sol";
import "../src/interfaces/ICIP1155Receiver.sol";

// ============================================================
// Hilfskontrakte
// ============================================================

contract MockReceiver1155 is ICIP1155Receiver {
    bytes4 public lastSingleSelector;
    bytes4 public lastBatchSelector;
    uint256 public lastId;
    uint256 public lastValue;
    uint256[] public lastIds;
    uint256[] public lastValues;

    function onCIP1155Received(
        address, address, uint256 id, uint256 value, bytes calldata
    ) external override returns (bytes4) {
        lastId = id;
        lastValue = value;
        lastSingleSelector = ICIP1155Receiver.onCIP1155Received.selector;
        return ICIP1155Receiver.onCIP1155Received.selector;
    }

    function onCIP1155BatchReceived(
        address, address, uint256[] calldata ids, uint256[] calldata values, bytes calldata
    ) external override returns (bytes4) {
        lastIds = ids;
        lastValues = values;
        lastBatchSelector = ICIP1155Receiver.onCIP1155BatchReceived.selector;
        return ICIP1155Receiver.onCIP1155BatchReceived.selector;
    }
}

contract BadReceiver1155 is ICIP1155Receiver {
    function onCIP1155Received(address, address, uint256, uint256, bytes calldata)
        external pure override returns (bytes4) { return bytes4(0xdeadbeef); }
    function onCIP1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure override returns (bytes4) { return bytes4(0xdeadbeef); }
}

contract RevertReceiver1155 is ICIP1155Receiver {
    function onCIP1155Received(address, address, uint256, uint256, bytes calldata)
        external pure override returns (bytes4) { revert("RevertReceiver: rejected"); }
    function onCIP1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure override returns (bytes4) { revert("RevertReceiver: rejected"); }
}

// ============================================================
// Tests
// ============================================================

contract CIP1155TokenTest is Test {
    // Event-Deklarationen für vm.expectEmit
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    CIP1155Token token;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob   = address(0x3);
    address carol = address(0x4);

    string constant BASE_URI = "https://meta.example.com/{id}.json";

    function setUp() public {
        vm.prank(owner);
        token = new CIP1155Token(BASE_URI);
    }

    // ============================================================
    // Constructor
    // ============================================================

    function test_constructor_setsOwner() public {
        assertEq(token.owner(), owner);
    }

    function test_constructor_setsUri() public {
        assertEq(token.uri(0), BASE_URI);
        assertEq(token.uri(42), BASE_URI);
    }

    function test_constructor_balanceZero() public {
        assertEq(token.balanceOf(alice, 1), 0);
        assertEq(token.balanceOf(alice, 2), 0);
    }

    // ============================================================
    // mint (single)
    // ============================================================

    function test_mint_increasesBalance() public {
        vm.prank(owner);
        token.mint(alice, 1, 100, "", "");
        assertEq(token.balanceOf(alice, 1), 100);
    }

    function test_mint_multipleMints_sameId() public {
        vm.prank(owner);
        token.mint(alice, 1, 100, "", "");
        vm.prank(owner);
        token.mint(alice, 1, 50, "", "");
        assertEq(token.balanceOf(alice, 1), 150);
    }

    function test_mint_differentIds() public {
        vm.prank(owner);
        token.mint(alice, 1, 100, "", "");
        vm.prank(owner);
        token.mint(alice, 2, 200, "", "");
        assertEq(token.balanceOf(alice, 1), 100);
        assertEq(token.balanceOf(alice, 2), 200);
    }

    function test_mint_setsCustomUri() public {
        string memory customUri = "https://custom.example.com/1.json";
        vm.prank(owner);
        token.mint(alice, 1, 100, customUri, "");
        assertEq(token.uri(1), customUri);
    }

    function test_mint_emitsTransferSingleFromZero() public {
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(owner, address(0), alice, 1, 100);
        vm.prank(owner);
        token.mint(alice, 1, 100, "", "");
    }

    function test_mint_emitsURI_whenCustomUri() public {
        vm.expectEmit(false, false, false, true);
        emit URI("https://custom.example.com/1.json", 1);
        vm.prank(owner);
        token.mint(alice, 1, 100, "https://custom.example.com/1.json", "");
    }

    function test_mint_revertsNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP1155: not owner");
        token.mint(alice, 1, 100, "", "");
    }

    function test_mint_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CIP1155: mint to zero address");
        token.mint(address(0), 1, 100, "", "");
    }

    function test_mint_revertsZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert("CIP1155: amount must be > 0");
        token.mint(alice, 1, 0, "", "");
    }

    // ============================================================
    // mintBatch
    // ============================================================

    function _ids2() internal pure returns (uint256[] memory ids) {
        ids = new uint256[](2);
        ids[0] = 1; ids[1] = 2;
    }

    function _amounts2() internal pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = 100; amounts[1] = 200;
    }

    function test_mintBatch_increasesBalances() public {
        vm.prank(owner);
        token.mintBatch(alice, _ids2(), _amounts2(), "");
        assertEq(token.balanceOf(alice, 1), 100);
        assertEq(token.balanceOf(alice, 2), 200);
    }

    function test_mintBatch_emitsTransferBatch() public {
        vm.expectEmit(true, true, true, false);
        emit TransferBatch(owner, address(0), alice, _ids2(), _amounts2());
        vm.prank(owner);
        token.mintBatch(alice, _ids2(), _amounts2(), "");
    }

    function test_mintBatch_revertsNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP1155: not owner");
        token.mintBatch(alice, _ids2(), _amounts2(), "");
    }

    function test_mintBatch_revertsLengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1; ids[1] = 2; amounts[0] = 100;
        vm.prank(owner);
        vm.expectRevert("CIP1155: length mismatch");
        token.mintBatch(alice, ids, amounts, "");
    }

    // ============================================================
    // balanceOf / balanceOfBatch
    // ============================================================

    function test_balanceOf_revertsZeroAddress() public {
        vm.expectRevert("CIP1155: zero address");
        token.balanceOf(address(0), 1);
    }

    function test_balanceOfBatch_returnsCorrectValues() public {
        vm.prank(owner);
        token.mint(alice, 1, 100, "", "");
        vm.prank(owner);
        token.mint(bob, 2, 200, "", "");

        address[] memory accounts = new address[](2);
        uint256[] memory ids = new uint256[](2);
        accounts[0] = alice; accounts[1] = bob;
        ids[0] = 1; ids[1] = 2;

        uint256[] memory balances = token.balanceOfBatch(accounts, ids);
        assertEq(balances[0], 100);
        assertEq(balances[1], 200);
    }

    function test_balanceOfBatch_revertsLengthMismatch() public {
        address[] memory accounts = new address[](2);
        uint256[] memory ids = new uint256[](1);
        vm.expectRevert("CIP1155: length mismatch");
        token.balanceOfBatch(accounts, ids);
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
        vm.expectRevert("CIP1155: approve to caller");
        token.setApprovalForAll(alice, true);
    }

    // ============================================================
    // safeTransferFrom
    // ============================================================

    function _mintAlice(uint256 id, uint256 amount) internal {
        vm.prank(owner);
        token.mint(alice, id, amount, "", "");
    }

    function test_safeTransferFrom_byOwner() public {
        _mintAlice(1, 100);
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1, 60, "");
        assertEq(token.balanceOf(alice, 1), 40);
        assertEq(token.balanceOf(bob, 1), 60);
    }

    function test_safeTransferFrom_byOperator() public {
        _mintAlice(1, 100);
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        vm.prank(bob);
        token.safeTransferFrom(alice, carol, 1, 50, "");
        assertEq(token.balanceOf(alice, 1), 50);
        assertEq(token.balanceOf(carol, 1), 50);
    }

    function test_safeTransferFrom_emitsTransferSingle() public {
        _mintAlice(1, 100);
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(alice, alice, bob, 1, 60);
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1, 60, "");
    }

    function test_safeTransferFrom_revertsNotApproved() public {
        _mintAlice(1, 100);
        vm.prank(bob);
        vm.expectRevert("CIP1155: not approved");
        token.safeTransferFrom(alice, carol, 1, 50, "");
    }

    function test_safeTransferFrom_revertsInsufficientBalance() public {
        _mintAlice(1, 50);
        vm.prank(alice);
        vm.expectRevert("CIP1155: insufficient balance");
        token.safeTransferFrom(alice, bob, 1, 100, "");
    }

    function test_safeTransferFrom_revertsZeroAddressTo() public {
        _mintAlice(1, 100);
        vm.prank(alice);
        vm.expectRevert("CIP1155: transfer to zero address");
        token.safeTransferFrom(alice, address(0), 1, 50, "");
    }

    // ============================================================
    // safeBatchTransferFrom
    // ============================================================

    function test_safeBatchTransferFrom_byOwner() public {
        _mintAlice(1, 100);
        _mintAlice(2, 200);

        uint256[] memory ids = _ids2();
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 40; amounts[1] = 80;

        vm.prank(alice);
        token.safeBatchTransferFrom(alice, bob, ids, amounts, "");

        assertEq(token.balanceOf(alice, 1), 60);
        assertEq(token.balanceOf(alice, 2), 120);
        assertEq(token.balanceOf(bob, 1), 40);
        assertEq(token.balanceOf(bob, 2), 80);
    }

    function test_safeBatchTransferFrom_emitsTransferBatch() public {
        _mintAlice(1, 100);
        _mintAlice(2, 200);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 40; amounts[1] = 80;

        vm.expectEmit(true, true, true, false);
        emit TransferBatch(alice, alice, bob, _ids2(), amounts);

        vm.prank(alice);
        token.safeBatchTransferFrom(alice, bob, _ids2(), amounts, "");
    }

    function test_safeBatchTransferFrom_revertsLengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1; ids[1] = 2; amounts[0] = 10;
        vm.prank(alice);
        vm.expectRevert("CIP1155: length mismatch");
        token.safeBatchTransferFrom(alice, bob, ids, amounts, "");
    }

    // ============================================================
    // burn
    // ============================================================

    function test_burn_byOwner() public {
        _mintAlice(1, 100);
        vm.prank(alice);
        token.burn(alice, 1, 40);
        assertEq(token.balanceOf(alice, 1), 60);
    }

    function test_burn_emitsTransferSingleToZero() public {
        _mintAlice(1, 100);
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(alice, alice, address(0), 1, 40);
        vm.prank(alice);
        token.burn(alice, 1, 40);
    }

    function test_burn_byOperator() public {
        _mintAlice(1, 100);
        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        vm.prank(bob);
        token.burn(alice, 1, 50);
        assertEq(token.balanceOf(alice, 1), 50);
    }

    function test_burn_revertsInsufficientBalance() public {
        _mintAlice(1, 50);
        vm.prank(alice);
        vm.expectRevert("CIP1155: insufficient balance");
        token.burn(alice, 1, 100);
    }

    function test_burn_revertsNotApproved() public {
        _mintAlice(1, 100);
        vm.prank(bob);
        vm.expectRevert("CIP1155: not approved");
        token.burn(alice, 1, 50);
    }

    // ============================================================
    // burnBatch
    // ============================================================

    function test_burnBatch_decreasesBalances() public {
        _mintAlice(1, 100);
        _mintAlice(2, 200);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 30; amounts[1] = 70;

        vm.prank(alice);
        token.burnBatch(alice, _ids2(), amounts);
        assertEq(token.balanceOf(alice, 1), 70);
        assertEq(token.balanceOf(alice, 2), 130);
    }

    function test_burnBatch_emitsTransferBatch() public {
        _mintAlice(1, 100);
        _mintAlice(2, 200);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 30; amounts[1] = 70;

        vm.expectEmit(true, true, true, false);
        emit TransferBatch(alice, alice, address(0), _ids2(), amounts);
        vm.prank(alice);
        token.burnBatch(alice, _ids2(), amounts);
    }

    function test_burnBatch_revertsLengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1; ids[1] = 2; amounts[0] = 10;
        vm.prank(alice);
        vm.expectRevert("CIP1155: length mismatch");
        token.burnBatch(alice, ids, amounts);
    }

    // ============================================================
    // setTokenURI
    // ============================================================

    function test_setTokenURI_overridesBaseUri() public {
        string memory custom = "https://custom.example.com/5.json";
        vm.prank(owner);
        token.setTokenURI(5, custom);
        assertEq(token.uri(5), custom);
        // Other IDs still return base URI
        assertEq(token.uri(6), BASE_URI);
    }

    function test_setTokenURI_emitsURI() public {
        vm.expectEmit(false, false, false, true);
        emit URI("https://custom.example.com/5.json", 5);
        vm.prank(owner);
        token.setTokenURI(5, "https://custom.example.com/5.json");
    }

    function test_setTokenURI_revertsNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP1155: not owner");
        token.setTokenURI(1, "https://example.com/1.json");
    }

    // ============================================================
    // Receiver Tests
    // ============================================================

    function test_mint_toValidReceiver() public {
        MockReceiver1155 receiver = new MockReceiver1155();
        vm.prank(owner);
        token.mint(address(receiver), 1, 100, "", "");
        assertEq(token.balanceOf(address(receiver), 1), 100);
        assertEq(receiver.lastId(), 1);
        assertEq(receiver.lastValue(), 100);
    }

    function test_mint_rejectsBadReceiver() public {
        BadReceiver1155 bad = new BadReceiver1155();
        vm.prank(owner);
        vm.expectRevert("CIP1155: non-receiver contract");
        token.mint(address(bad), 1, 100, "", "");
    }

    function test_mint_rejectsRevertReceiver() public {
        RevertReceiver1155 rev = new RevertReceiver1155();
        vm.prank(owner);
        vm.expectRevert("RevertReceiver: rejected");
        token.mint(address(rev), 1, 100, "", "");
    }

    function test_mintBatch_toValidReceiver() public {
        MockReceiver1155 receiver = new MockReceiver1155();
        vm.prank(owner);
        token.mintBatch(address(receiver), _ids2(), _amounts2(), "");
        assertEq(token.balanceOf(address(receiver), 1), 100);
        assertEq(token.balanceOf(address(receiver), 2), 200);
    }

    function test_transfer_toValidReceiver() public {
        _mintAlice(1, 100);
        MockReceiver1155 receiver = new MockReceiver1155();
        vm.prank(alice);
        token.safeTransferFrom(alice, address(receiver), 1, 60, "");
        assertEq(token.balanceOf(address(receiver), 1), 60);
    }

    function test_transfer_rejectsBadReceiver() public {
        _mintAlice(1, 100);
        BadReceiver1155 bad = new BadReceiver1155();
        vm.prank(alice);
        vm.expectRevert("CIP1155: non-receiver contract");
        token.safeTransferFrom(alice, address(bad), 1, 50, "");
    }

    // ============================================================
    // Multi-token Scenario
    // ============================================================

    function test_scenario_fungibleAndNFT() public {
        // Token ID 1: Fungible (Währung) – 1000 Einheiten
        vm.prank(owner);
        token.mint(alice, 1, 1000, "https://meta.example.com/currency.json", "");

        // Token ID 2: Semi-fungible (Ticket) – 50 Stück
        vm.prank(owner);
        token.mint(bob, 2, 50, "https://meta.example.com/ticket.json", "");

        // Token ID 3: Unikat (NFT) – 1 Stück
        vm.prank(owner);
        token.mint(carol, 3, 1, "https://meta.example.com/nft.json", "");

        assertEq(token.balanceOf(alice, 1), 1000);
        assertEq(token.balanceOf(bob, 2), 50);
        assertEq(token.balanceOf(carol, 3), 1);

        // Alice sendet 200 Währungs-Token an Bob
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1, 200, "");
        assertEq(token.balanceOf(alice, 1), 800);
        assertEq(token.balanceOf(bob, 1), 200);

        // Carol sendet ihr NFT an Alice
        vm.prank(carol);
        token.safeTransferFrom(carol, alice, 3, 1, "");
        assertEq(token.balanceOf(carol, 3), 0);
        assertEq(token.balanceOf(alice, 3), 1);
    }
}
