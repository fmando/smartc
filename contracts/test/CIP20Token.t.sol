// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Test.sol";
import "../src/CIP20Token.sol";
import "../src/interfaces/ICIP20.sol";

/// @title CIP20Token Tests
/// @notice Unit Tests für den CIP-20 Token Contract
contract CIP20TokenTest is Test {
    // Events lokal deklarieren für vm.expectEmit
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    CIP20Token public token;

    address public owner = address(1);
    address public alice = address(2);
    address public bob = address(3);

    string constant NAME = "Test Token";
    string constant SYMBOL = "TTK";
    uint8 constant DECIMALS = 18;
    uint256 constant TOTAL_SUPPLY = 1_000_000 * 10**18;

    function setUp() public {
        vm.prank(owner);
        token = new CIP20Token(NAME, SYMBOL, DECIMALS, TOTAL_SUPPLY);
    }

    // ========== Constructor Tests ==========

    function test_constructor_setsName() public {
        assertEq(token.name(), NAME);
    }

    function test_constructor_setsSymbol() public {
        assertEq(token.symbol(), SYMBOL);
    }

    function test_constructor_setsDecimals() public {
        assertEq(token.decimals(), DECIMALS);
    }

    function test_constructor_setsTotalSupply() public {
        assertEq(token.totalSupply(), TOTAL_SUPPLY);
    }

    function test_constructor_assignsSupplyToOwner() public {
        assertEq(token.balanceOf(owner), TOTAL_SUPPLY);
    }

    function test_constructor_setsOwner() public {
        assertEq(token.owner(), owner);
    }

    function test_constructor_revertsOnEmptyName() public {
        vm.expectRevert("CIP20Token: name cannot be empty");
        new CIP20Token("", SYMBOL, DECIMALS, TOTAL_SUPPLY);
    }

    function test_constructor_revertsOnEmptySymbol() public {
        vm.expectRevert("CIP20Token: symbol cannot be empty");
        new CIP20Token(NAME, "", DECIMALS, TOTAL_SUPPLY);
    }

    function test_constructor_revertsOnZeroSupply() public {
        vm.expectRevert("CIP20Token: totalSupply must be > 0");
        new CIP20Token(NAME, SYMBOL, DECIMALS, 0);
    }

    // ========== Transfer Tests ==========

    function test_transfer_succeeds() public {
        uint256 amount = 100 * 10**18;
        vm.prank(owner);
        bool success = token.transfer(alice, amount);
        assertTrue(success);
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.balanceOf(owner), TOTAL_SUPPLY - amount);
    }

    function test_transfer_emitsEvent() public {
        uint256 amount = 50 * 10**18;
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, alice, amount);
        token.transfer(alice, amount);
    }

    function test_transfer_revertsOnInsufficientBalance() public {
        uint256 amount = TOTAL_SUPPLY + 1;
        vm.prank(owner);
        vm.expectRevert("CIP20Token: transfer amount exceeds balance");
        token.transfer(alice, amount);
    }

    function test_transfer_revertsToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CIP20Token: transfer to zero address");
        token.transfer(address(0), 100);
    }

    // ========== Approve & TransferFrom Tests ==========

    function test_approve_succeeds() public {
        uint256 amount = 500 * 10**18;
        vm.prank(owner);
        bool success = token.approve(alice, amount);
        assertTrue(success);
        assertEq(token.allowance(owner, alice), amount);
    }

    function test_transferFrom_succeeds() public {
        uint256 amount = 200 * 10**18;
        vm.prank(owner);
        token.approve(alice, amount);

        vm.prank(alice);
        bool success = token.transferFrom(owner, bob, amount);
        assertTrue(success);
        assertEq(token.balanceOf(bob), amount);
        assertEq(token.allowance(owner, alice), 0);
    }

    function test_transferFrom_revertsOnInsufficientAllowance() public {
        uint256 amount = 200 * 10**18;
        vm.prank(owner);
        token.approve(alice, amount - 1);

        vm.prank(alice);
        vm.expectRevert("CIP20Token: transfer amount exceeds allowance");
        token.transferFrom(owner, bob, amount);
    }

    // ========== Mint & Burn Tests ==========

    function test_mint_ownerCanMint() public {
        uint256 mintAmount = 500 * 10**18;
        vm.prank(owner);
        token.mint(alice, mintAmount);
        assertEq(token.balanceOf(alice), mintAmount);
        assertEq(token.totalSupply(), TOTAL_SUPPLY + mintAmount);
    }

    function test_mint_revertsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP20Token: caller is not the owner");
        token.mint(alice, 100);
    }

    function test_burn_succeeds() public {
        uint256 burnAmount = 100 * 10**18;
        vm.prank(owner);
        token.burn(burnAmount);
        assertEq(token.balanceOf(owner), TOTAL_SUPPLY - burnAmount);
        assertEq(token.totalSupply(), TOTAL_SUPPLY - burnAmount);
    }

    function test_burn_revertsOnInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert("CIP20Token: burn amount exceeds balance");
        token.burn(1);
    }

    // ========== Ownership Tests ==========

    function test_transferOwnership_succeeds() public {
        vm.prank(owner);
        token.transferOwnership(alice);
        assertEq(token.owner(), alice);
    }

    function test_transferOwnership_revertsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP20Token: caller is not the owner");
        token.transferOwnership(bob);
    }

    // ========== Fuzz Tests ==========

    function testFuzz_transfer(uint256 amount) public {
        amount = bound(amount, 0, TOTAL_SUPPLY);
        vm.prank(owner);
        token.transfer(alice, amount);
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.balanceOf(owner), TOTAL_SUPPLY - amount);
    }

    function testFuzz_approve(uint256 amount) public {
        vm.prank(owner);
        token.approve(alice, amount);
        assertEq(token.allowance(owner, alice), amount);
    }
}
