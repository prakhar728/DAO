// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {ConfigurableProtocol} from "../src/ConfigurableProtocol.sol";

contract DeployConfigurableProtocol is Script {
    function run() external {
        // Retrieve private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract with the deployer as the governor
        address deployerAddress = vm.addr(deployerPrivateKey);
        ConfigurableProtocol protocol = new ConfigurableProtocol(
            deployerAddress
        );

        // Optional: Set initial parameters
        // protocol.setInterestRate(5); // 5%
        // protocol.setStakingReward(10); // 10%
        // protocol.setTransactionFee(2); // 2%

        // Stop broadcasting
        vm.stopBroadcast();

        // Log the deployed contract address
        console.log("ConfigurableProtocol deployed at:", address(protocol));
    }
}
