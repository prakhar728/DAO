export interface ContractParams {
  name: string;
  symbol: string;
  purpose: string;
  description: string;
  
  votingDelay: number;   // in blocks or seconds, depending on tokenClockMode
  votingPeriod: number;  // in blocks or seconds, depending on tokenClockMode
  proposalThreshold: number;
  quorumNumerator: number; // percentage between 1-100
  tokenDecimals?: number;
  updatableSettings?: boolean;
  
  // Votes type
  votesType: 'ERC20Votes' | 'ERC721Votes';
  
  // Token clock mode
  tokenClockMode: 'BlockNumber' | 'Timestamp';
  blockTimeSeconds?: number; // Only relevant if using BlockNumber mode
  
  // Timelock
  timelockType: 'None' | 'TimelockController' | 'Compound';
  minTimelockDelay?: number; // in seconds
  
  // Upgradeability
  upgradeability: 'None' | 'Transparent' | 'UUPS';
  
  // Information
  securityContact?: string;
  license?: string;
  
  // Existing token
  hasExistingToken: 'yes' | 'no';
  tokenAddress?: string;
  
  // Addresses
  treasuryAddress?: string;
  adminAddress?: string;
}