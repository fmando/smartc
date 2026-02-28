// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Test.sol";
import "../src/CIP102Ownable.sol";
import "../src/interfaces/ICIP102.sol";

/// @title CIP102Ownable Tests
/// @notice Unit Tests für den CIP-102 Ownership Management Contract
contract CIP102OwnableTest is Test {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    CIP102Ownable public ownable;

    address public deployer = address(1);
    address public alice   = address(2);
    address public bob     = address(3);

    function setUp() public {
        vm.prank(deployer);
        ownable = new CIP102Ownable("Test Contract");
    }

    // ========== Constructor ==========

    function test_constructor_setsOwner() public {
        assertEq(ownable.owner(), deployer);
    }

    function test_constructor_setsLabel() public {
        assertEq(ownable.label(), "Test Contract");
    }

    function test_constructor_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(address(0), deployer);
        vm.prank(deployer);
        new CIP102Ownable("Another Contract");
    }

    function test_constructor_revertsOnEmptyLabel() public {
        vm.expectRevert("CIP102: label cannot be empty");
        new CIP102Ownable("");
    }

    // ========== transferOwnership ==========

    function test_transferOwnership_succeeds() public {
        vm.prank(deployer);
        ownable.transferOwnership(alice);
        assertEq(ownable.owner(), alice);
    }

    function test_transferOwnership_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(deployer, alice);
        vm.prank(deployer);
        ownable.transferOwnership(alice);
    }

    function test_transferOwnership_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP102: caller is not the owner");
        ownable.transferOwnership(bob);
    }

    function test_transferOwnership_revertsOnZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert("CIP102: new owner is the zero address");
        ownable.transferOwnership(address(0));
    }

    // ========== renounceOwnership ==========

    function test_renounceOwnership_setsOwnerToZero() public {
        vm.prank(deployer);
        ownable.renounceOwnership();
        assertEq(ownable.owner(), address(0));
    }

    function test_renounceOwnership_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(deployer, address(0));
        vm.prank(deployer);
        ownable.renounceOwnership();
    }

    function test_renounceOwnership_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("CIP102: caller is not the owner");
        ownable.renounceOwnership();
    }

    function test_renounceOwnership_preventsSubsequentActions() public {
        vm.prank(deployer);
        ownable.renounceOwnership();
        vm.prank(deployer);
        vm.expectRevert("CIP102: caller is not the owner");
        ownable.transferOwnership(alice);
    }

    // ========== ICIP102 Interface ==========

    function test_implementsICIP102Interface() public {
        ICIP102 iface = ICIP102(address(ownable));
        assertEq(iface.owner(), deployer);
    }
}
