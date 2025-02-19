// src/types/contracts.ts

/**
 * Parameters for generating governance contracts
 */
export interface ContractParams {
  /** Name of the DAO/organization */
  name: string;
  
  /** Token symbol */
  symbol: string;
  
  /** Purpose of the DAO */
  purpose: string;
  
  /** Description of the governance system */
  description: string;
  
  /** 
   * Governance type/settings
   * e.g., "standard", "timelock", etc.
   */
  governance: string;
  
  /**
   * Voting configuration
   * e.g., "standard 3-day voting", "short voting period", "high threshold"
   */
  voting: string;
  
  /**
   * Whether an existing token is used
   * Options: "yes" or "no"
   */
  hasExistingToken: string;
  
  /** 
   * Address of existing token (if applicable)
   * Required if hasExistingToken is "yes"
   */
  tokenAddress?: string;
  
  /**
   * Treasury address for the DAO
   */
  treasuryAddress?: string;
  
  /**
   * Admin address for initial setup
   */
  adminAddress?: string;
}

/**
 * Response for contract generation
 */
export interface ContractGenerationResponse {
  success: boolean;
  message: string;
  contracts?: {
    governanceToken: string;
    governanceContract: string;
  };
  error?: string;
}