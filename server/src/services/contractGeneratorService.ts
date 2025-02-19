// src/services/contractGeneratorService.ts
import fs from 'fs';
import path from 'path';
import { ContractParams } from '../types/contract';

export class ContractGeneratorService {
  /**
   * Generates Solidity contract files based on provided parameters
   * @param params Contract generation parameters
   * @param saveToFile Whether to save contracts to files
   * @returns Object containing generated contract code
   */
  public generateContracts(params: ContractParams, saveToFile: boolean = false):  { 
    governanceToken: string;
    governanceContract: string;
    filePaths?: {
      tokenPath: string;
      governancePath: string;
    };
  }  {
    // Generate governance token contract
    const governanceToken = this.generateGovernanceToken(params);
    
    // Generate governance contract
    const governanceContract = this.generateGovernanceContract(params);
    

    const result = {
      governanceToken,
      governanceContract
    };
    
    // Save to files if requested
    if (saveToFile) {
      const filePaths = this.saveContractsToFiles(params, governanceToken, governanceContract);
      return {
        ...result,
        filePaths
      };
    }
    
    return result;
  }

  /**
   * Saves generated contracts to .sol files
   * @param params Original parameters
   * @param tokenContract Token contract code
   * @param governanceContract Governance contract code
   * @returns Paths to saved files
   */
  private saveContractsToFiles(
    params: ContractParams,
    tokenContract: string,
    governanceContract: string
  ): { tokenPath: string; governancePath: string } {
    const outputDir = process.env.CONTRACT_OUTPUT_DIR || path.join(process.cwd(), 'generated-contracts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Sanitize name for filename
    const safeName = params.name.replace(/\s+/g, '');
    
    // Create filenames
    const tokenFilename = params.hasExistingToken === "yes" 
      ? `${params.symbol}TokenInterface.sol` 
      : `${params.symbol}Token.sol`;
    const governanceFilename = `${safeName}Governance.sol`;
    
    // Build full paths
    const tokenPath = path.join(outputDir, tokenFilename);
    const governancePath = path.join(outputDir, governanceFilename);
    
    // Write files
    fs.writeFileSync(tokenPath, tokenContract, 'utf8');
    fs.writeFileSync(governancePath, governanceContract, 'utf8');
    
    return {
      tokenPath,
      governancePath
    };
  }

  /**
   * Generates a governance token contract
   */
  private generateGovernanceToken(params: ContractParams): string {
    const { name, symbol, hasExistingToken, tokenAddress, adminAddress } = params;
    
    if (hasExistingToken === "yes" && tokenAddress) {
      // Return interface for existing token
      return this.generateExistingTokenInterface(tokenAddress);
    }
    
    // Template for new governance token
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ${name} Governance Token
 * @dev Governance token for ${name} DAO
 */
contract ${symbol}Token is ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    constructor() 
        ERC20("${name} Governance Token", "${symbol}") 
        ERC20Permit("${name} Governance Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, ${adminAddress || "msg.sender"});
        _grantRole(MINTER_ROLE, ${adminAddress || "msg.sender"});
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
}`;
  }

  /**
   * Generates interface for existing token
   */
  private generateExistingTokenInterface(tokenAddress: string): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExistingGovernanceToken
 * @dev Interface for existing governance token at ${tokenAddress}
 */
interface IExistingGovernanceToken {
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function delegates(address account) external view returns (address);
    function delegate(address delegatee) external;
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external;
}

// Use the existing token at address: ${tokenAddress}`;
  }

  /**
   * Generates a governance contract
   */
  private generateGovernanceContract(params: ContractParams): string {
    const { 
      name, 
      purpose, 
      description, 
      governance, 
      voting, 
      hasExistingToken, 
      tokenAddress, 
      treasuryAddress, 
      adminAddress 
    } = params;
    
    // Determine governance type
    const isTimelockGovernance = governance.toLowerCase().includes("timelock");
    
    // Determine voting parameters
    const votingPeriod = this.getVotingPeriod(voting);
    const votingDelay = this.getVotingDelay(voting);
    const quorumNumerator = this.getQuorumNumerator(voting);
    
    const tokenContractReference = hasExistingToken === "yes" && tokenAddress 
      ? tokenAddress 
      : `${params.symbol}Token`;

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
${isTimelockGovernance ? 'import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";' : ''}

/**
 * @title ${name} Governance
 * @dev ${description}
 * Purpose: ${purpose}
 */
contract ${name.replace(/\s+/g, '')}Governance is 
    Governor, 
    GovernorSettings, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction${isTimelockGovernance ? ', GovernorTimelockControl' : ''} {
    
    constructor(IVotes _token${isTimelockGovernance ? ', TimelockController _timelock' : ''})
        Governor("${name} Governance")
        GovernorSettings(${votingDelay}, ${votingPeriod}, 0) // votingDelay, votingPeriod, proposal threshold
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(${quorumNumerator})
        ${isTimelockGovernance ? 'GovernorTimelockControl(_timelock)' : ''}
    {}

    // The following functions are overrides required by Solidity.
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(IGovernor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(Governor${isTimelockGovernance ? ', GovernorTimelockControl' : ''}) returns (ProposalState) {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    ${isTimelockGovernance ? `
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
    ` : ''}

    function supportsInterface(bytes4 interfaceId) public view override(Governor${isTimelockGovernance ? ', GovernorTimelockControl' : ''}) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

${isTimelockGovernance ? this.generateTimelockContract(name, treasuryAddress, adminAddress) : ''}`;
  }

  /**
   * Generates timelock controller if needed
   */
  private generateTimelockContract(name: string, treasuryAddress?: string, adminAddress?: string): string {
    return `
/**
 * @title ${name} Timelock Controller
 */
contract ${name.replace(/\s+/g, '')}Timelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}

// Deployment script should include:
// 1. Deploy token
// 2. Deploy timelock with appropriate delay (e.g., 2 days = 172800 seconds)
// 3. Setup roles: admin=${adminAddress || 'deployer'}, treasury=${treasuryAddress || 'multi-sig wallet'}
// 4. Deploy governance with token and timelock
`;
  }

  /**
   * Helper to determine voting period based on voting preferences
   */
  private getVotingPeriod(voting: string): string {
    if (voting.toLowerCase().includes("short")) {
      return "6545"; // ~1 day with 13s blocks
    } else if (voting.toLowerCase().includes("long")) {
      return "45818"; // ~1 week with 13s blocks
    } else {
      return "19636"; // ~3 days with 13s blocks (default)
    }
  }

  /**
   * Helper to determine voting delay based on voting preferences
   */
  private getVotingDelay(voting: string): string {
    if (voting.toLowerCase().includes("immediate")) {
      return "1"; // 1 block
    } else if (voting.toLowerCase().includes("delayed")) {
      return "6545"; // ~1 day with 13s blocks
    } else {
      return "1"; // 1 block (default)
    }
  }

  /**
   * Helper to determine quorum numerator based on voting preferences
   */
  private getQuorumNumerator(voting: string): string {
    if (voting.toLowerCase().includes("high threshold") || voting.toLowerCase().includes("high quorum")) {
      return "10"; // 10% quorum
    } else if (voting.toLowerCase().includes("low threshold") || voting.toLowerCase().includes("low quorum")) {
      return "4"; // 4% quorum
    } else {
      return "5"; // 5% quorum (default)
    }
  }
}