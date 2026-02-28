// SPDX-License-Identifier: MIT
pragma solidity >=1.1.0;

import {StdStorage} from "./StdStorage.sol";
import {Vm, VmSafe} from "./Vm.sol";
import {Checksum} from "./checksum.sol";

abstract contract CommonBase {
    // Cheat code address, 0x{cb,ab,ce}{chksum}fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8.
    address internal VM_ADDRESS = Checksum.toIcan(uint160(bytes20(hex"fc06a12b7a6f30e2a3c16a3b5d502cd71c20f2f8")));
    // console.sol and console2.sol work by executing a staticcall to this address.
    address internal CONSOLE = Checksum.toIcan(uint160(bytes20(hex"000000000000000000636f6e736f6c652e6c6f67")));
    // Default address for tx.origin and msg.sender, 0x{cb,ab,ce}{chksum}1804c8ab1f12e6bbf3894d4083f33e07309d1f38.
    address internal DEFAULT_SENDER = Checksum.toIcan(uint160(bytes20(hex"1804c8ab1f12e6bbf3894d4083f33e07309d1f38")));
    // Address of the test contract, deployed by the DEFAULT_SENDER.
    address internal DEFAULT_TEST_CONTRACT = Checksum.toIcan(uint160(bytes20(hex"5615deb798bb3e4dfa0139dfa1b3d433cc23b72f")));
    // Deterministic deployment address of the Multicall3 contract.
    address internal MULTICALL3_ADDRESS = Checksum.toIcan(uint160(bytes20(hex"ca11bde05977b3631167028862be2a173976ca11")));
    // The order of the secp256k1 curve.
    uint256 internal constant SECP256K1_ORDER =
        115792089237316195423570985008687907852837564279074904382605163141518161494337;

    uint256 internal constant UINT256_MAX =
        115792089237316195423570985008687907853269984665640564039457584007913129639935;

    Vm vm = Vm(VM_ADDRESS);
    StdStorage internal stdstore;

    // Used when deploying with create2, https://github.com/Arachnid/deterministic-deployment-proxy.
    function CREATE2_FACTORY() internal view returns (address) {
        uint8 chainId = uint8(block.chainid);
        if (chainId == 1) { // mainnet - 'cb'
            return address(0xcb063edadf999cb7b8b3ebc71f5e97783176d289d640);
        } else if (chainId == 3) { // devin network - 'ab'
            return address(0xab800ee5e10bfbd37bc647e01d94489b4e244817b07f);
        }
        // private network
        return address(0xce8147e798c3a0d867f70f8785334da06c3418e18ba9);
    }
}

abstract contract TestBase is CommonBase {}

abstract contract ScriptBase is CommonBase {
    VmSafe internal vmSafe = VmSafe(VM_ADDRESS);
}
