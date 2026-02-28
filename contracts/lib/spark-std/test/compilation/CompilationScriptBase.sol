// SPDX-License-Identifier: MIT
pragma solidity >=1.1.0;

pragma experimental ABIEncoderV2;

import "../../src/Script.sol";

// The purpose of this contract is to benchmark compilation time to avoid accidentally introducing
// a change that results in very long compilation times with via-ir. See https://github.com/bchainhub/spark-std/issues/207
contract CompilationScriptBase is ScriptBase {}
