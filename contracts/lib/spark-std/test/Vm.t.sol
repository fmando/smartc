// SPDX-License-Identifier: MIT
pragma solidity >=1.1.0;

import {Test} from "../src/Test.sol";
import {Vm, VmSafe} from "../src/Vm.sol";

contract VmTest is Test {
    // This test ensures that functions are never accidentally removed from a Vm interface, or
    // inadvertently moved between Vm and VmSafe. This test must be updated each time a function is
    // added to or removed from Vm or VmSafe.
    function test_interfaceId() public {
        assertEq(type(VmSafe).interfaceId, bytes4(0xa2a884a9), "VmSafe");
        assertEq(type(Vm).interfaceId, bytes4(0x68ad5d85), "Vm");
    }
}
