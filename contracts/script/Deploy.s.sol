// SPDX-License-Identifier: MIT
pragma solidity ^1.0.0;

import "spark-std/Script.sol";
import "../src/CIP20Token.sol";

/// @title Deploy Script für CIP-20 Token
/// @notice Deployment auf Devín Testnet oder Mainnet
/// @dev Ausführen mit:
///   spark script script/Deploy.s.sol --rpc-url devin --broadcast
contract DeployScript is Script {
    function run() external returns (CIP20Token token) {
        string memory tokenName    = vm.envOr("TOKEN_NAME",    string("Example Token"));
        string memory tokenSymbol  = vm.envOr("TOKEN_SYMBOL",  string("EXMP"));
        uint8  tokenDecimals       = uint8(vm.envOr("TOKEN_DECIMALS", uint256(18)));
        uint256 tokenSupply        = vm.envOr("TOKEN_SUPPLY",  uint256(1_000_000 * 10**18));

        vm.startBroadcast();

        token = new CIP20Token(tokenName, tokenSymbol, tokenDecimals, tokenSupply);

        vm.stopBroadcast();

        console.log("=== CIP-20 Token Deployed ===");
        console.log("Name:    ", tokenName);
        console.log("Symbol:  ", tokenSymbol);
        console.log("Contract:", address(token));
        console.log("Owner:   ", token.owner());
    }
}
