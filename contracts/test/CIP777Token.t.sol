// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Test.sol";
import "../src/CIP777Token.sol";
import "../src/interfaces/ICIP777.sol";
import "../src/interfaces/ICIP777Recipient.sol";

/// @title CIP777Token Tests
contract CIP777TokenTest is Test {

    event Sent(address indexed operator, address indexed from, address indexed to, uint256 amount, bytes data, bytes operatorData);
    event Minted(address indexed operator, address indexed to, uint256 amount, bytes data, bytes operatorData);
    event Burned(address indexed operator, address indexed from, uint256 amount, bytes data, bytes operatorData);
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);

    CIP777Token public token;

    address public owner    = address(1);
    address public alice    = address(2);
    address public bob      = address(3);
    address public operator = address(4);

    uint256 constant SUPPLY = 1_000_000e18;

    function setUp() public {
        vm.prank(owner);
        token = new CIP777Token("TestToken777", "T777", SUPPLY, 1, new address[](0));
    }

    // ========== Constructor ==========

    function test_constructor_setsMetadata() public {
        assertEq(token.name(),     "TestToken777");
        assertEq(token.symbol(),   "T777");
        assertEq(token.granularity(), 1);
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(owner), SUPPLY);
        assertEq(token.owner(), owner);
    }

    function test_constructor_emitsMinted() public {
        vm.expectEmit(true, true, false, true);
        emit Minted(owner, owner, SUPPLY, "", "");
        vm.prank(owner);
        new CIP777Token("X", "X", SUPPLY, 1, new address[](0));
    }

    function test_constructor_revertsEmptyName() public {
        vm.expectRevert("CIP777: name cannot be empty");
        new CIP777Token("", "SYM", SUPPLY, 1, new address[](0));
    }

    function test_constructor_revertsEmptySymbol() public {
        vm.expectRevert("CIP777: symbol cannot be empty");
        new CIP777Token("Name", "", SUPPLY, 1, new address[](0));
    }

    function test_constructor_revertsZeroSupply() public {
        vm.expectRevert("CIP777: initialSupply must be > 0");
        new CIP777Token("Name", "SYM", 0, 1, new address[](0));
    }

    function test_constructor_revertsInvalidGranularity() public {
        vm.expectRevert("CIP777: granularity must be >= 1");
        new CIP777Token("Name", "SYM", SUPPLY, 0, new address[](0));
    }

    function test_constructor_revertsSupplyNotMultiple() public {
        vm.expectRevert("CIP777: supply not a multiple of granularity");
        new CIP777Token("Name", "SYM", 100, 3, new address[](0));
    }

    // ========== Send ==========

    function test_send_succeeds() public {
        vm.prank(owner);
        token.send(alice, 100e18, "");
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.balanceOf(owner), SUPPLY - 100e18);
    }

    function test_send_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit Sent(owner, owner, alice, 100e18, "", "");
        vm.prank(owner);
        token.send(alice, 100e18, "");
    }

    function test_send_revertsInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert("CIP777: insufficient balance");
        token.send(bob, 1, "");
    }

    function test_send_revertsToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CIP777: send to zero address");
        token.send(address(0), 1, "");
    }

    function test_send_revertsGranularity() public {
        vm.prank(owner);
        CIP777Token gt = new CIP777Token("G", "G", 1000, 10, new address[](0));
        vm.prank(owner);
        vm.expectRevert();
        gt.send(alice, 7, "");
    }

    // ========== Burn ==========

    function test_burn_succeeds() public {
        vm.prank(owner);
        token.burn(500e18, "");
        assertEq(token.totalSupply(), SUPPLY - 500e18);
        assertEq(token.balanceOf(owner), SUPPLY - 500e18);
    }

    function test_burn_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Burned(owner, owner, 500e18, "", "");
        vm.prank(owner);
        token.burn(500e18, "");
    }

    function test_burn_revertsInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert("CIP777: insufficient balance to burn");
        token.burn(1, "");
    }

    // ========== Operators ==========

    function test_isOperatorFor_selfIsOperator() public {
        assertTrue(token.isOperatorFor(owner, owner));
    }

    function test_authorizeOperator_succeeds() public {
        vm.prank(owner);
        token.authorizeOperator(operator);
        assertTrue(token.isOperatorFor(operator, owner));
    }

    function test_authorizeOperator_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit AuthorizedOperator(operator, owner);
        vm.prank(owner);
        token.authorizeOperator(operator);
    }

    function test_revokeOperator_succeeds() public {
        vm.prank(owner);
        token.authorizeOperator(operator);
        vm.prank(owner);
        token.revokeOperator(operator);
        assertFalse(token.isOperatorFor(operator, owner));
    }

    function test_revokeOperator_emitsEvent() public {
        vm.prank(owner);
        token.authorizeOperator(operator);
        vm.expectEmit(true, true, false, false);
        emit RevokedOperator(operator, owner);
        vm.prank(owner);
        token.revokeOperator(operator);
    }

    function test_authorizeOperator_revertsForSelf() public {
        vm.prank(owner);
        vm.expectRevert("CIP777: authorizing self as operator");
        token.authorizeOperator(owner);
    }

    // ========== OperatorSend ==========

    function test_operatorSend_succeeds() public {
        vm.prank(owner);
        token.authorizeOperator(operator);
        vm.prank(operator);
        token.operatorSend(owner, alice, 200e18, "", "op-data");
        assertEq(token.balanceOf(alice), 200e18);
    }

    function test_operatorSend_revertsUnauthorized() public {
        vm.prank(operator);
        vm.expectRevert("CIP777: caller is not an operator for holder");
        token.operatorSend(owner, alice, 100e18, "", "");
    }

    // ========== OperatorBurn ==========

    function test_operatorBurn_succeeds() public {
        vm.prank(owner);
        token.authorizeOperator(operator);
        vm.prank(operator);
        token.operatorBurn(owner, 100e18, "", "");
        assertEq(token.totalSupply(), SUPPLY - 100e18);
    }

    function test_operatorBurn_revertsUnauthorized() public {
        vm.prank(operator);
        vm.expectRevert("CIP777: caller is not an operator for holder");
        token.operatorBurn(owner, 100e18, "", "");
    }

    // ========== DefaultOperators ==========

    function test_defaultOperators_isOperator() public {
        address[] memory defOps = new address[](1);
        defOps[0] = operator;
        vm.prank(owner);
        CIP777Token t = new CIP777Token("D", "D", SUPPLY, 1, defOps);
        assertTrue(t.isOperatorFor(operator, alice));
        assertEq(t.defaultOperators()[0], operator);
    }

    function test_defaultOperators_canBeRevoked() public {
        address[] memory defOps = new address[](1);
        defOps[0] = operator;
        vm.prank(owner);
        CIP777Token t = new CIP777Token("D", "D", SUPPLY, 1, defOps);
        vm.prank(alice);
        t.revokeOperator(operator);
        assertFalse(t.isOperatorFor(operator, alice));
    }

    function test_defaultOperators_canBeReAuthorized() public {
        address[] memory defOps = new address[](1);
        defOps[0] = operator;
        vm.prank(owner);
        CIP777Token t = new CIP777Token("D", "D", SUPPLY, 1, defOps);
        vm.prank(alice);
        t.revokeOperator(operator);
        vm.prank(alice);
        t.authorizeOperator(operator);
        assertTrue(t.isOperatorFor(operator, alice));
    }

    // ========== Mint (Owner only) ==========

    function test_mint_ownerCanMint() public {
        vm.prank(owner);
        token.mint(alice, 500e18, "");
        assertEq(token.balanceOf(alice), 500e18);
        assertEq(token.totalSupply(), SUPPLY + 500e18);
    }

    function test_mint_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP777: caller is not the owner");
        token.mint(bob, 1, "");
    }

    // ========== Interface ==========

    function test_implementsICIP777() public {
        ICIP777 iface = ICIP777(address(token));
        assertEq(iface.name(), "TestToken777");
    }
}
