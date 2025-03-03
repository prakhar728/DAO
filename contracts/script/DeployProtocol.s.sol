// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Governance} from "../src/Governance.sol";
import {GovernanceToken} from "../src/GovernanceToken.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract DeployGovernance is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the GovernanceToken
        GovernanceToken token = new GovernanceToken();
        console.log("GovernanceToken deployed at:", address(token));
        
        // Mint some tokens to the deployer for initial governance power
        token.mint(deployer, 100_000 * 10**18); // 100,000 tokens
        console.log("Minted 100,000 tokens to deployer");

        // 2. Deploy the TimelockController
        // Parameters for the timelock:
        uint256 minDelay = 1 days; // 1 day delay for timelock actions
        address[] memory proposers = new address[](0); // Will be set to the governor contract later
        address[] memory executors = new address[](0); // Empty array means anyone can execute
        address admin = deployer; // Admin will later renounce this role
        
        TimelockController timelock = new TimelockController(
            minDelay,
            proposers,
            executors,
            admin
        );
        console.log("TimelockController deployed at:", address(timelock));

        // 3. Deploy the Governance contract
        Governance governor = new Governance(token, timelock);
        console.log("Governance contract deployed at:", address(governor));

        // 4. Set up the roles correctly
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        // Grant the proposer role to the governor
        timelock.grantRole(proposerRole, address(governor));
        console.log("Granted PROPOSER_ROLE to Governance contract");
        
        // Grant executor role to address(0) - means anyone can execute
        timelock.grantRole(executorRole, address(0));
        console.log("Granted EXECUTOR_ROLE to address(0) (anyone can execute)");
        
        // Renounce admin role after setup is complete
        timelock.revokeRole(adminRole, admin);
        console.log("Revoked TIMELOCK_ADMIN_ROLE from deployer");
        
        // Delegate votes to the deployer for them to participate in governance
        token.delegate(deployer);
        console.log("Delegated votes to deployer");

        vm.stopBroadcast();

        // Print summary
        console.log("\nDEPLOYMENT SUMMARY");
        console.log("-------------------");
        console.log("GovernanceToken:    ", address(token));
        console.log("TimelockController: ", address(timelock));
        console.log("Governance:         ", address(governor));
        console.log("Voting Delay:       ", governor.votingDelay(), "blocks");
        console.log("Voting Period:      ", governor.votingPeriod(), "blocks");
        console.log("Proposal Threshold: ", governor.proposalThreshold());
        console.log("Quorum Fraction:    ", "4%");
        console.log("Timelock Delay:     ", minDelay, "seconds");
    }
}