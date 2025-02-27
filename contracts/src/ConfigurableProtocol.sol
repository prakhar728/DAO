// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ConfigurableProtocol {
    address public governor;
    uint256 public interestRate; // Example: 5 = 5%
    uint256 public stakingReward; // Example: 10 = 10% APY
    uint256 public transactionFee; // Example: 2 = 2%
    
    event GovernanceUpdated(address indexed oldGovernor, address indexed newGovernor);
    event InterestRateUpdated(uint256 oldRate, uint256 newRate);
    event StakingRewardUpdated(uint256 oldReward, uint256 newReward);
    event TransactionFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _governor) {
        require(_governor != address(0), "Invalid governor address");
        governor = _governor;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Not authorized: Only Governor");
        _;
    }

    function setGovernor(address _newGovernor) external onlyGovernor {
        require(_newGovernor != address(0), "Invalid new governor address");
        emit GovernanceUpdated(governor, _newGovernor);
        governor = _newGovernor;
    }

    function setInterestRate(uint256 _newRate) external onlyGovernor {
        emit InterestRateUpdated(interestRate, _newRate);
        interestRate = _newRate;
    }

    function setStakingReward(uint256 _newReward) external onlyGovernor {
        emit StakingRewardUpdated(stakingReward, _newReward);
        stakingReward = _newReward;
    }

    function setTransactionFee(uint256 _newFee) external onlyGovernor {
        emit TransactionFeeUpdated(transactionFee, _newFee);
        transactionFee = _newFee;
    }
}
