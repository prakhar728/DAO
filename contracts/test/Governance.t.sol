// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import {Governance} from "../src/Governance.sol";
import {GovernanceToken} from "../src/GovernanceToken.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract MyGovernorTest is Test {
    Governance public governor;
    GovernanceToken public token;
    TimelockController public timelock;

    address public owner = address(1);
    address public voter1 = address(2);
    address public voter2 = address(3);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy governance token
        token = new GovernanceToken();

        // Deploy timelock with 1 hour minimum delay
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);
        timelock = new TimelockController(
            3600, // 1 hour delay
            proposers,
            executors,
            owner
        );

        // Deploy governor
        governor = new Governance(IVotes(address(token)), timelock);

        // Setup roles
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(proposerRole, address(governor));
        timelock.grantRole(executorRole, address(0)); // Allow anyone to execute
        timelock.revokeRole(adminRole, owner);

        vm.stopPrank();
    }

    function test_GovernorInitialization() public view {
        assertEq(governor.name(), "Governance");
        assertEq(governor.votingDelay(), 7200); // 1 day
        assertEq(governor.votingPeriod(), 50400); // 1 week
        assertEq(governor.proposalThreshold(), 0);
    }

    function test_TokenDelegation() public {
        // Mint tokens to voter1
        vm.startPrank(owner);
        token.mint(voter1, 100e18);
        vm.stopPrank();

        // Delegate votes
        vm.startPrank(voter1);
        token.delegate(voter1);
        vm.stopPrank();

        assertEq(token.getVotes(voter1), 100e18);
    }

    function test_ProposalCreationAndVoting() public {
        // Mint and delegate tokens
        vm.startPrank(owner);
        token.mint(voter1, 100e18);
        token.mint(voter2, 50e18);
        vm.stopPrank();

        vm.prank(voter1);
        token.delegate(voter1);

        vm.prank(voter2);
        token.delegate(voter2);

        // Create proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "mint(address,uint256)",
            address(this),
            1000e18
        );

        string memory description = "Proposal #1: Mint tokens";

        vm.prank(voter1);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        // Advance time past voting delay
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast votes
        vm.prank(voter1);
        governor.castVote(proposalId, 1); // Vote in favor

        vm.prank(voter2);
        governor.castVote(proposalId, 0); // Vote against

        // Check vote counts
        (
            uint256 againstVotes,
            uint256 forVotes,
            uint256 abstainVotes
        ) = governor.proposalVotes(proposalId);

        assertEq(forVotes, 100e18);
        assertEq(againstVotes, 50e18);
        assertEq(abstainVotes, 0);
    }

    function test_ProposalExecution() public {
        // Setup proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "mint(address,uint256)",
            address(this),
            1000e18
        );

        string memory description = "Proposal #1: Mint tokens";

        // Mint and delegate tokens for quorum
        vm.startPrank(owner);
        token.mint(voter1, 1000e18); // Enough for quorum
        vm.stopPrank();

        vm.prank(voter1);
        token.delegate(voter1);

        // Create proposal
        vm.prank(voter1);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        // Advance time past voting delay
        vm.roll(block.number + governor.votingDelay() + 1);

        // Vote
        vm.prank(voter1);
        governor.castVote(proposalId, 1);

        // Advance time past voting period
        vm.roll(block.number + governor.votingPeriod() + 1);

        // Queue the proposal
        bytes32 descriptionHash = keccak256(bytes(description));
        governor.queue(targets, values, calldatas, descriptionHash);

        // Advance time past timelock
        vm.warp(block.timestamp + timelock.getMinDelay() + 1);

        // Execute
        governor.execute(targets, values, calldatas, descriptionHash);

        // Verify execution
        assertEq(token.balanceOf(address(this)), 1000e18);
    }

    function test_QuorumRequirement() public {
        // First mint a significant total supply to make quorum calculation meaningful
        vm.startPrank(owner);
        token.mint(address(this), 1000000e18); // 1 million tokens total supply
        vm.stopPrank();

        // Create proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "mint(address,uint256)",
            address(this),
            1000e18
        );

        string memory description = "Proposal #1: Mint tokens";

        // Mint small amount of tokens (not enough for quorum - less than 4% of total supply)
        vm.startPrank(owner);
        token.mint(voter1, 35000e18); // 3.5% of total supply
        vm.stopPrank();

        vm.prank(voter1);
        token.delegate(voter1);

        vm.roll(block.number + 1);

        // Check quorum requirement
        uint256 quorum = governor.quorum(block.number - 1);
        console.log("Required quorum:", quorum);
        console.log("Voter1 votes:", token.getVotes(voter1));
        assertGt(
            quorum,
            token.getVotes(voter1),
            "Voter should have less than quorum"
        );

        // Create and vote on proposal
        vm.prank(voter1);
        uint256 proposalId = governor.propose(
            targets,
            values,
            calldatas,
            description
        );

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(voter1);
        governor.castVote(proposalId, 1);

        vm.roll(block.number + governor.votingPeriod() + 1);


        // Attempt to queue should revert due to not meeting quorum
        bytes32 descriptionHash = keccak256(bytes(description));
        vm.expectRevert();
        governor.queue(targets, values, calldatas, descriptionHash);
    }
}
