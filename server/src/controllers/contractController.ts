// src/controllers/contractController.ts
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ContractGeneratorService } from '../services/contractGeneratorService';
import { ContractParams } from '../types/contract';

export class ContractController {
  private contractService = new ContractGeneratorService();

  /**
   * Validation rules for contract generation
   */
  public validateContractGeneration = [
    // Basic parameters
    body('name').notEmpty().withMessage('Name is required'),
    body('symbol').notEmpty().withMessage('Symbol is required'),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('description').notEmpty().withMessage('Description is required'),
    
    // Settings
    body('votingDelay').isInt({ min: 0 }).withMessage('Voting delay must be a non-negative integer'),
    body('votingPeriod').isInt({ min: 1 }).withMessage('Voting period must be a positive integer'),
    body('proposalThreshold').isInt({ min: 0 }).withMessage('Proposal threshold must be a non-negative integer'),
    body('quorumNumerator').isInt({ min: 1, max: 100 }).withMessage('Quorum percentage must be between 1 and 100'),
    body('tokenDecimals').optional().isInt({ min: 0, max: 18 }).withMessage('Token decimals must be between 0 and 18'),
    body('updatableSettings').optional().isBoolean().withMessage('Updatable settings must be a boolean'),
    
    // Votes type
    body('votesType').isIn(['ERC20Votes', 'ERC721Votes']).withMessage('Votes type must be either "ERC20Votes" or "ERC721Votes"'),
    
    // Token clock mode
    body('tokenClockMode').isIn(['BlockNumber', 'Timestamp']).withMessage('Token clock mode must be either "BlockNumber" or "Timestamp"'),
    body('blockTimeSeconds').optional().isInt({ min: 1 }).withMessage('Block time in seconds must be a positive integer'),
    
    // Timelock
    body('timelockType').isIn(['None', 'TimelockController', 'Compound']).withMessage('Timelock type must be "None", "TimelockController", or "Compound"'),
    body('minTimelockDelay').optional().isInt({ min: 0 }).withMessage('Minimum timelock delay must be a non-negative integer'),
    
    // Upgradeability
    body('upgradeability').isIn(['None', 'Transparent', 'UUPS']).withMessage('Upgradeability must be "None", "Transparent", or "UUPS"'),
    
    // Info
    body('securityContact').optional().isString(),
    body('license').optional().isString().default('MIT'),
    
    // Existing token parameters
    body('hasExistingToken').isIn(['yes', 'no']).withMessage('hasExistingToken must be "yes" or "no"'),
    body('tokenAddress').if(body('hasExistingToken').equals('yes'))
      .notEmpty().withMessage('Token address is required when using existing token')
      .matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid Ethereum address format'),
    
    // Addresses
    body('treasuryAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid Ethereum address format'),
    body('adminAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid Ethereum address format'),
  ];

  /**
   * Generate contracts based on provided parameters
   */
  public generateContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
        return;
      }

      const params: ContractParams = req.body;
      const saveToFile = req.query.saveToFile === 'true';
      
      const result = this.contractService.generateContracts(params, saveToFile);
      
      const responseMessage = saveToFile && result.filePaths
        ? `Contracts generated and saved to files successfully`
        : 'Contracts generated successfully';
      
      res.status(200).json({
        success: true,
        message: responseMessage,
        contracts: {
          contract1: {
            name: 'token',
            code: result.governanceToken
          },
          contract2: {
            name: 'governance',
            code: result.governanceContract
          },
          ...(result.timelockContract && {
            contract3: {
              name: 'timelock',
              code: result.timelockContract
            }
          })
        },
        ...(result.filePaths && { filePaths: result.filePaths })
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate contracts',
        error: error.message
      });
    }
  };
}