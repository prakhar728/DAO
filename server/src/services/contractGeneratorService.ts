// src/services/contractGeneratorService.ts
import fs from "fs";
import path from "path";
import { ContractParams } from "../types/contract";

export class ContractGeneratorService {
  /**
   * Generates Solidity contract files based on provided parameters
   * @param params Contract generation parameters
   * @param saveToFile Whether to save contracts to files
   * @returns Object containing generated contract code
   */
  public generateContracts(
    params: ContractParams,
    saveToFile: boolean = false
  ): {
    governanceToken: string;
    governanceContract: string;
    timelockContract?: string;
    filePaths?: {
      tokenPath: string;
      governancePath: string;
      timelockPath?: string;
    };
  } {
    const governanceToken = this.generateGovernanceToken(params);
    const governanceContract = this.generateGovernanceContract(params);

    // Generate timelock contract if needed
    let timelockContract: string | undefined;
    if (params.timelockType !== "None") {
      timelockContract = this.generateTimelockContract(params);
    }

    const result = {
      governanceToken,
      governanceContract,
      ...(timelockContract && { timelockContract }),
    };

    if (saveToFile) {
      const filePaths = this.saveContractsToFiles(
        params,
        governanceToken,
        governanceContract,
        timelockContract
      );
      return {
        ...result,
        filePaths,
      };
    }

    return result;
  }

  /**
   * Saves generated contracts to .sol files
   * @param params Original parameters
   * @param tokenContract Token contract code
   * @param governanceContract Governance contract code
   * @param timelockContract Optional timelock contract code
   * @returns Paths to saved files
   */
  private saveContractsToFiles(
    params: ContractParams,
    tokenContract: string,
    governanceContract: string,
    timelockContract?: string
  ): { tokenPath: string; governancePath: string; timelockPath?: string } {
    const outputDir =
      process.env.CONTRACT_OUTPUT_DIR ||
      path.join(process.cwd(), "generated-contracts");

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sanitize name for filename
    const safeName = params.name.replace(/\s+/g, "");

    // Create filenames
    const tokenFilename =
      params.hasExistingToken === "yes"
        ? `${params.symbol}TokenInterface.sol`
        : `${params.symbol}Token.sol`;
    const governanceFilename = `${safeName}Governance.sol`;
    const timelockFilename = `${safeName}Timelock.sol`;

    // Build full paths
    const tokenPath = path.join(outputDir, tokenFilename);
    const governancePath = path.join(outputDir, governanceFilename);
    const timelockPath = timelockContract
      ? path.join(outputDir, timelockFilename)
      : undefined;

    // Write files
    fs.writeFileSync(tokenPath, tokenContract, "utf8");
    fs.writeFileSync(governancePath, governanceContract, "utf8");

    if (timelockContract && timelockPath) {
      fs.writeFileSync(timelockPath, timelockContract, "utf8");
      return { tokenPath, governancePath, timelockPath };
    }

    return {
      tokenPath,
      governancePath,
    };
  }

  /**
   * Generates a governance token contract
   */
  private generateGovernanceToken(params: ContractParams): string {
    const {
      name,
      symbol,
      hasExistingToken,
      tokenAddress,
      adminAddress,
      votesType,
      tokenDecimals = 18,
      tokenClockMode,
      upgradeability,
      license = "MIT",
    } = params;

    if (hasExistingToken === "yes" && tokenAddress) {
      // Return interface for existing token
      return this.generateExistingTokenInterface(
        tokenAddress,
        votesType,
        tokenClockMode
      );
    }

    // Use ERC721 base for NFT-based governance
    if (votesType === "ERC721Votes") {
      return this.generateERC721VotesToken(params);
    }

    // Get upgradeability elements
    const upgradeabilityImports = this.getUpgradeabilityImports(upgradeability);
    const upgradeabilityInheritance = this.getUpgradeabilityInheritance(
      upgradeability,
      true
    );
    const upgradeabilityFunctions = this.getUpgradeabilityFunctions(
      upgradeability,
      true
    );
    const upgradableConstructor =
      upgradeability !== "None"
        ? `
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address admin) public initializer {
        __ERC20_init("${name} Governance Token", "${symbol}");
        __ERC20Permit_init("${name} Governance Token");
        __ERC20Votes_init();
        ${upgradeability === "UUPS" ? "__UUPSUpgradeable_init();" : ""}
        ${upgradeability === "UUPS" ? "__AccessControl_init();" : ""}
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        
        // Set token decimals
        ${tokenDecimals !== 18 ? `_setupDecimals(${tokenDecimals});` : ""}
    }`
        : `
    constructor() 
        ERC20("${name} Governance Token", "${symbol}") 
        ERC20Permit("${name} Governance Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, ${adminAddress || "msg.sender"});
        _grantRole(MINTER_ROLE, ${adminAddress || "msg.sender"});
        
        // Set token decimals
        ${tokenDecimals !== 18 ? `_setupDecimals(${tokenDecimals});` : ""}
    }`;

    // Template for new ERC20 governance token
    return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.22;

${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";'
}
${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/access/AccessControl.sol";'
}
${
  tokenClockMode === "Timestamp"
    ? upgradeability !== "None"
      ? 'import "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";'
      : 'import "@openzeppelin/contracts/utils/Checkpoints.sol";'
    : ""
}
${upgradeabilityImports}

/**
 * @title ${name} Governance Token
 * @dev Governance token for ${name} DAO
 */
contract ${symbol}Token is ${
      upgradeability !== "None"
        ? "ERC20VotesUpgradeable, AccessControlUpgradeable"
        : "ERC20Votes, AccessControl"
    }${upgradeabilityInheritance} {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    ${upgradableConstructor}
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    ${
      tokenClockMode === "Timestamp"
        ? `// Override clock to use timestamps instead of block numbers
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }
    
    // Override CLOCK_MODE to indicate we're using timestamps
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }`
        : ""
    }
    
    // The functions below are overrides required by Solidity
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(${
      upgradeability !== "None" ? "ERC20VotesUpgradeable" : "ERC20Votes"
    }) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(${
      upgradeability !== "None" ? "ERC20VotesUpgradeable" : "ERC20Votes"
    }) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(${
      upgradeability !== "None" ? "ERC20VotesUpgradeable" : "ERC20Votes"
    }) {
        super._burn(account, amount);
    }${upgradeabilityFunctions}
}`;
  }

  /**
   * Generates timelock controller contract
   */
  private generateTimelockContract(params: ContractParams): string {
    const {
      name,
      treasuryAddress,
      adminAddress,
      minTimelockDelay = 172800, // 2 days in seconds
      timelockType,
      upgradeability,
      license = "MIT",
    } = params;

    const isCompoundTimelock = timelockType === "Compound";

    if (isCompoundTimelock) {
      return this.generateCompoundTimelock(
        name,
        treasuryAddress,
        adminAddress,
        minTimelockDelay,
        upgradeability,
        license
      );
    }

    // Get upgradeability imports and contract details for TimelockController
    const isUpgradeable = upgradeability !== "None";
    const upgradeabilityImports = this.getUpgradeabilityImports(upgradeability);
    const upgradeabilityInheritance = this.getUpgradeabilityInheritance(
      upgradeability,
      false
    );
    const upgradeabilityFunctions = this.getUpgradeabilityFunctions(
      upgradeability,
      false
    );

    // Build constructor or initializer
    const constructorOrInitializer = isUpgradeable
      ? `
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) public initializer {
        __TimelockController_init(minDelay, proposers, executors, admin);
        ${upgradeability === "UUPS" ? "__UUPSUpgradeable_init();" : ""}
    }`
      : `
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}`;

    return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.22;

${
  isUpgradeable
    ? 'import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/governance/TimelockController.sol";'
}
${upgradeabilityImports}

/**
 * @title ${name} Timelock Controller
 * @dev TimelockController for ${name} DAO governance
 */
contract ${name.replace(/\s+/g, "")}Timelock is ${
      isUpgradeable ? "TimelockControllerUpgradeable" : "TimelockController"
    }${upgradeabilityInheritance} {
    ${constructorOrInitializer}${upgradeabilityFunctions}
}

// Deployment script should include:
// 1. Deploy token
// 2. Deploy timelock with appropriate delay (${minTimelockDelay} seconds = ${Math.floor(
      minTimelockDelay / 86400
    )} days)
// 3. Setup roles: admin=${adminAddress || "deployer"}, treasury=${
      treasuryAddress || "multi-sig wallet"
    }
// 4. Deploy governance with token and timelock
`;
  }

  /**
   * Generates Compound-style timelock
   */
  private generateCompoundTimelock(
    name: string,
    treasuryAddress?: string,
    adminAddress?: string,
    minDelay: number = 172800,
    upgradeability: string = "None",
    license: string = "MIT"
  ): string {
    // Get upgradeability imports and contract details
    const isUpgradeable = upgradeability !== "None";
    const upgradeabilityImports = this.getUpgradeabilityImports(upgradeability);
    const upgradeabilityInheritance = this.getUpgradeabilityInheritance(
      upgradeability,
      false
    );
    const upgradeabilityFunctions = this.getUpgradeabilityFunctions(
      upgradeability,
      false
    );

    // Build constructor or initializer
    const constructorOrInitializer = isUpgradeable
      ? `
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(uint _delay, address _admin) public initializer {
        require(_delay >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        
        delay = _delay;
        admin = _admin;
        ${upgradeability === "UUPS" ? "__UUPSUpgradeable_init();" : ""}
    }`
      : `
    constructor(uint _delay, address _admin) {
        require(_delay >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        
        delay = _delay;
        admin = _admin;
    }`;

    return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.22;

${upgradeabilityImports}
${
  isUpgradeable
    ? 'import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";'
    : ""
}

/**
 * @title ${name} Compound Timelock
 * @dev Compound-style timelock for ${name} DAO governance
 */
contract ${name.replace(/\s+/g, "")}Timelock${
      isUpgradeable ? " is Initializable" : ""
    }${upgradeabilityInheritance} {
    address public admin;
    uint public constant GRACE_PERIOD = 14 days;
    uint public constant MINIMUM_DELAY = ${minDelay};
    uint public constant MAXIMUM_DELAY = 30 days;
    uint public delay;
    
    mapping(bytes32 => bool) public queuedTransactions;
    
    event NewAdmin(address indexed newAdmin);
    event NewDelay(uint indexed newDelay);
    event QueueTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    event CancelTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    event ExecuteTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    ${constructorOrInitializer}
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller must be admin");
        _;
    }
    
    function setDelay(uint _delay) public onlyAdmin {
        require(_delay >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        delay = _delay;
        
        emit NewDelay(delay);
    }
    
    function setAdmin(address _admin) public onlyAdmin {
        admin = _admin;
        emit NewAdmin(admin);
    }
    
    function queueTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin returns (bytes32) {
        require(eta >= block.timestamp + delay, "Estimated execution time must satisfy delay");
        
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = true;
        
        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }
    
    function cancelTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = false;
        
        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }
    
    function executeTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin payable returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(queuedTransactions[txHash], "Transaction hasn't been queued");
        require(block.timestamp >= eta, "Transaction hasn't surpassed time lock");
        require(block.timestamp <= eta + GRACE_PERIOD, "Transaction is stale");
        
        queuedTransactions[txHash] = false;
        
        bytes memory callData;
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }
        
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Transaction execution reverted");
        
        emit ExecuteTransaction(txHash, target, value, signature, data, eta);
        
        return returnData;
    }${upgradeabilityFunctions}
}

// Deployment script should include:
// 1. Deploy token
// 2. Deploy timelock with appropriate delay (${minDelay} seconds = ${Math.floor(
      minDelay / 86400
    )} days)
// 3. Setup admin=${adminAddress || "deployer"}, treasury=${
      treasuryAddress || "multi-sig wallet"
    }
// 4. Deploy governance with token and timelock`;
  }

  /**
   * Gets upgradeability imports based on selected upgradeability type
   */
  private getUpgradeabilityImports(upgradeability: string): string {
    if (upgradeability === "Transparent") {
      return 'import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";';
    } else if (upgradeability === "UUPS") {
      return 'import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";\nimport "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";';
    }
    return "";
  }

  /**
   * Gets upgradeability inheritance based on selected upgradeability type
   */
  private getUpgradeabilityInheritance(
    upgradeability: string,
    isToken: boolean
  ): string {
    if (upgradeability === "UUPS") {
      return isToken ? ", UUPSUpgradeable" : ", UUPSUpgradeable";
    }
    return "";
  }

  /**
   * Gets upgradeability functions based on selected upgradeability type
   */
  private getUpgradeabilityFunctions(
    upgradeability: string,
    isToken: boolean
  ): string {
    if (upgradeability === "UUPS") {
      return `
    
    function _authorizeUpgrade(address newImplementation) internal override ${
      isToken ? "onlyRole(DEFAULT_ADMIN_ROLE)" : "onlyAdmin"
    } {}`;
    }
    return "";
  }

  /**
   * Generates an ERC721 token with voting capabilities
   */
  private generateERC721VotesToken(params: ContractParams): string {
    const {
      name,
      symbol,
      adminAddress,
      tokenClockMode,
      upgradeability,
      license = "MIT",
    } = params;

    // Get upgradeability elements
    const upgradeabilityImports = this.getUpgradeabilityImports(upgradeability);
    const upgradeabilityInheritance = this.getUpgradeabilityInheritance(
      upgradeability,
      false
    );
    const upgradeabilityFunctions = this.getUpgradeabilityFunctions(
      upgradeability,
      false
    );
    const upgradableConstructor =
      upgradeability !== "None"
        ? `
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address admin) public initializer {
        __ERC721_init("${name} Governance Token", "${symbol}");
        __ERC721Permit_init("${name}");
        __ERC721Votes_init();
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        ${upgradeability === "UUPS" ? "__UUPSUpgradeable_init();" : ""}
        ${upgradeability === "UUPS" ? "__AccessControl_init();" : ""}
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }`
        : `
    constructor() 
        ERC721("${name} Governance Token", "${symbol}") 
        ERC721Permit("${name}")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, ${adminAddress || "msg.sender"});
        _grantRole(MINTER_ROLE, ${adminAddress || "msg.sender"});
    }`;

    return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.22;

${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721VotesUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";'
}
${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";'
}
${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";'
}
${
  upgradeability !== "None"
    ? 'import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";'
    : 'import "@openzeppelin/contracts/access/AccessControl.sol";'
}
${
  tokenClockMode === "Timestamp"
    ? upgradeability !== "None"
      ? 'import "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";'
      : 'import "@openzeppelin/contracts/utils/Checkpoints.sol";'
    : ""
}
${upgradeabilityImports}

/**
 * @title ${name} Governance Token (NFT)
 * @dev NFT-based governance token for ${name} DAO
 */
contract ${symbol}Token is ${
      upgradeability !== "None"
        ? "ERC721VotesUpgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable"
        : "ERC721Votes, ERC721Enumerable, ERC721URIStorage, AccessControl"
    }${upgradeabilityInheritance} {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Track token IDs
    uint256 private _nextTokenId;
    ${upgradableConstructor}
    
    function mint(address to, string memory tokenURI) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
    
    ${
      tokenClockMode === "Timestamp"
        ? `// Override clock to use timestamps instead of block numbers
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }
    
    // Override CLOCK_MODE to indicate we're using timestamps
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }`
        : ""
    }
    
    // The following functions are overrides required by Solidity
    
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(${
          upgradeability !== "None"
            ? "ERC721Upgradeable, ERC721EnumerableUpgradeable"
            : "ERC721, ERC721Enumerable"
        })
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _afterTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(${
          upgradeability !== "None"
            ? "ERC721Upgradeable, ERC721VotesUpgradeable"
            : "ERC721, ERC721Votes"
        })
    {
        super._afterTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId)
        internal
        override(${
          upgradeability !== "None"
            ? "ERC721Upgradeable, ERC721URIStorageUpgradeable"
            : "ERC721, ERC721URIStorage"
        })
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(${
          upgradeability !== "None"
            ? "ERC721Upgradeable, ERC721URIStorageUpgradeable"
            : "ERC721, ERC721URIStorage"
        })
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(${
          upgradeability !== "None"
            ? "ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable"
            : "ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl"
        })
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }${upgradeabilityFunctions}
}`;
  }

  /**
   * Generates interface for existing token
   */
  private generateExistingTokenInterface(
    tokenAddress: string,
    votesType: "ERC20Votes" | "ERC721Votes",
    tokenClockMode: "BlockNumber" | "Timestamp"
  ): string {
    const interfaceName =
      votesType === "ERC20Votes"
        ? "IExistingERC20VotesToken"
        : "IExistingERC721VotesToken";

    const additionalMethods =
      votesType === "ERC721Votes"
        ? `
    // ERC721-specific methods
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);`
        : `
    // ERC20-specific methods
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);`;

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ${interfaceName}
 * @dev Interface for existing governance token at ${tokenAddress}
 */
interface ${interfaceName} {
    // Votes-related methods
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function delegates(address account) external view returns (address);
    function delegate(address delegatee) external;
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external;
    ${
      tokenClockMode === "Timestamp"
        ? `function clock() external view returns (uint48);
    function CLOCK_MODE() external pure returns (string memory);`
        : ""
    }${additionalMethods}
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
      votingDelay,
      votingPeriod,
      proposalThreshold,
      quorumNumerator,
      timelockType,
      tokenClockMode,
      hasExistingToken,
      tokenAddress,
      upgradeability,
      updatableSettings = false,
      securityContact,
      license = "MIT",
    } = params;

    // Determine if we need timelock
    const useTimelock = timelockType !== "None";
    const isCompoundTimelock = timelockType === "Compound";

    // Get token reference
    const tokenContractReference =
      hasExistingToken === "yes" && tokenAddress
        ? tokenAddress
        : `${params.symbol}Token`;

    // Get upgradeability imports and contract details
    const isUpgradeable = upgradeability !== "None";
    const upgradeabilityImports = this.getUpgradeabilityImports(upgradeability);
    const upgradeabilityInheritance = this.getUpgradeabilityInheritance(
      upgradeability,
      false
    );
    const upgradeabilityFunctions = this.getUpgradeabilityFunctions(
      upgradeability,
      false
    );

    // Generate NatSpec comments for security contact if provided
    const securityContactComment = securityContact
      ? `\n * @custom:security-contact ${securityContact}`
      : "";

    // Clock mode details
    const clockMode =
      tokenClockMode === "Timestamp"
        ? "\n * @dev Using timestamp-based clock mode"
        : "\n * @dev Using block number-based clock mode";

    // Calculate function overrides based on inheritance
    const stateOverrideInheritance = useTimelock
      ? `Governor, ${
          isCompoundTimelock
            ? "GovernorTimelockCompound"
            : "GovernorTimelockControl"
        }`
      : "Governor";

    // Determine if settings are updatable
    const settingsExtension = updatableSettings
      ? "GovernorSettingsUpgradeable"
      : "GovernorSettings";

    // New function overrides in OZ contracts v5+
    const proposalNeedsQueueingOverride = useTimelock
      ? `
    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, ${
          isCompoundTimelock
            ? "GovernorTimelockCompound"
            : "GovernorTimelockControl"
        })
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }`
      : "";

    const queueOperationsOverride = useTimelock
      ? `
    function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, ${
          isCompoundTimelock
            ? "GovernorTimelockCompound"
            : "GovernorTimelockControl"
        })
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }`
      : "";

    const executeOperationsOverride = useTimelock
      ? `
    function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, ${
          isCompoundTimelock
            ? "GovernorTimelockCompound"
            : "GovernorTimelockControl"
        })
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }`
      : "";

    // Build constructor and initializer
    const constructorOrInitializer = isUpgradeable
      ? `
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        IVotes _token${
          useTimelock
            ? isCompoundTimelock
              ? ", ICompoundTimelock _timelock"
              : ", TimelockController _timelock"
            : ""
        }
    ) public initializer {
        __Governor_init("${name} Governance");
        __${settingsExtension}_init(${votingDelay}, ${votingPeriod}, ${proposalThreshold});
        __GovernorVotes_init(_token);
        __GovernorVotesQuorumFraction_init(${quorumNumerator});
        ${
          useTimelock
            ? isCompoundTimelock
              ? "__GovernorTimelockCompound_init(_timelock);"
              : "__GovernorTimelockControl_init(_timelock);"
            : ""
        }
        ${upgradeability === "UUPS" ? "__UUPSUpgradeable_init();" : ""}
    }`
      : `
    constructor(
        IVotes _token${
          useTimelock
            ? isCompoundTimelock
              ? ", ICompoundTimelock _timelock"
              : ", TimelockController _timelock"
            : ""
        }
    )
        Governor("${name} Governance")
        ${settingsExtension}(${votingDelay}, ${votingPeriod}, ${proposalThreshold}) // votingDelay, votingPeriod, proposal threshold
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(${quorumNumerator})${
          useTimelock
            ? isCompoundTimelock
              ? "\n        GovernorTimelockCompound(_timelock)"
              : "\n        GovernorTimelockControl(_timelock)"
            : ""
        }
    {}`;

    // Generate imports based on upgradeability
    const governorImports = isUpgradeable
      ? `import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/${settingsExtension}.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
${
  useTimelock
    ? isCompoundTimelock
      ? 'import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockCompoundUpgradeable.sol";'
      : 'import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";'
    : ""
}`
      : `import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
${
  useTimelock
    ? isCompoundTimelock
      ? 'import "@openzeppelin/contracts/governance/extensions/GovernorTimelockCompound.sol";'
      : 'import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";'
    : ""
}`;

    // Generate interface imports based on chosen options
    const interfaceImports = isUpgradeable
      ? `import "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol" as IVotes;
${
  useTimelock
    ? isCompoundTimelock
      ? 'import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol" as ICompoundTimelock;'
      : 'import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";'
    : ""
}`
      : `import "@openzeppelin/contracts/governance/utils/IVotes.sol";
${
  useTimelock
    ? isCompoundTimelock
      ? 'import "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";' // For Compound interface
      : 'import "@openzeppelin/contracts/governance/TimelockController.sol";'
    : ""
}`;

    // Override functions based on upgradeability
    const overrideClasses = isUpgradeable
      ? {
          governor: "GovernorUpgradeable",
          settings: settingsExtension,
          votes: "GovernorVotesUpgradeable",
          quorum: "GovernorVotesQuorumFractionUpgradeable",
          timelock: isCompoundTimelock
            ? "GovernorTimelockCompoundUpgradeable"
            : "GovernorTimelockControlUpgradeable",
          iGovernor: "IGovernorUpgradeable",
        }
      : {
          governor: "Governor",
          settings: "GovernorSettings",
          votes: "GovernorVotes",
          quorum: "GovernorVotesQuorumFraction",
          timelock: isCompoundTimelock
            ? "GovernorTimelockCompound"
            : "GovernorTimelockControl",
          iGovernor: "IGovernor",
        };

    return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.22;

${governorImports}
${interfaceImports}
${upgradeabilityImports}

/**
 * @title ${name} Governance
 * @dev ${description}${clockMode}
 * Purpose: ${purpose}${securityContactComment}
 */
contract ${name.replace(/\s+/g, "")}Governance is 
    ${isUpgradeable ? "GovernorUpgradeable" : "Governor"}, 
    ${isUpgradeable ? settingsExtension : "GovernorSettings"}, 
    ${
      isUpgradeable
        ? "GovernorCountingSimpleUpgradeable"
        : "GovernorCountingSimple"
    }, 
    ${isUpgradeable ? "GovernorVotesUpgradeable" : "GovernorVotes"}, 
    ${
      isUpgradeable
        ? "GovernorVotesQuorumFractionUpgradeable"
        : "GovernorVotesQuorumFraction"
    }${
      useTimelock
        ? isCompoundTimelock
          ? isUpgradeable
            ? ", GovernorTimelockCompoundUpgradeable"
            : ", GovernorTimelockCompound"
          : isUpgradeable
          ? ", GovernorTimelockControlUpgradeable"
          : ", GovernorTimelockControl"
        : ""
    }${upgradeabilityInheritance} {
    ${constructorOrInitializer}${upgradeabilityFunctions}

    // The following functions are overrides required by Solidity.
    function votingDelay() public view override(${overrideClasses.iGovernor}, ${
      overrideClasses.settings
    }) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(${
      overrideClasses.iGovernor
    }, ${overrideClasses.settings}) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(${
      overrideClasses.iGovernor
    }, ${overrideClasses.quorum}) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(${
      useTimelock
        ? `${overrideClasses.governor}, ${overrideClasses.timelock}`
        : overrideClasses.governor
    }) returns (ProposalState) {
        return super.state(proposalId);
    }${proposalNeedsQueueingOverride}

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(${overrideClasses.governor}, ${
      overrideClasses.iGovernor
    }) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function proposalThreshold() public view override(${
      overrideClasses.governor
    }, ${overrideClasses.settings}) returns (uint256) {
        return super.proposalThreshold();
    }${queueOperationsOverride}${executeOperationsOverride}

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(${overrideClasses.governor}${
      useTimelock ? `, ${overrideClasses.timelock}` : ""
    }) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(${overrideClasses.governor}${
      useTimelock ? `, ${overrideClasses.timelock}` : ""
    }) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId) public view override(${
      overrideClasses.governor
    }${useTimelock ? `, ${overrideClasses.timelock}` : ""}) returns (bool) {
        return super.supportsInterface(interfaceId);
    }`;
  }
}
