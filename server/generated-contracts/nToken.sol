// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title name Governance Token
 * @dev Governance token for name DAO
 */
contract nToken is ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    constructor() 
        ERC20("name Governance Token", "n") 
        ERC20Permit("name Governance Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, 0x5Fdafb9B8957940400aF0bE8A8031AaBC73d678F);
        _grantRole(MINTER_ROLE, 0x5Fdafb9B8957940400aF0bE8A8031AaBC73d678F);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    // The functions below are overrides required by Solidity
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
}