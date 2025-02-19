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
    body('name').notEmpty().withMessage('Name is required'),
    body('symbol').notEmpty().withMessage('Symbol is required'),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('governance').notEmpty().withMessage('Governance type is required'),
    body('voting').notEmpty().withMessage('Voting parameters are required'),
    body('hasExistingToken').isIn(['yes', 'no']).withMessage('hasExistingToken must be "yes" or "no"'),
    body('tokenAddress').if(body('hasExistingToken').equals('yes'))
      .notEmpty().withMessage('Token address is required when using existing token')
      .matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid Ethereum address format'),
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
      // Check validation results
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
      
      // Generate contracts
      const result = this.contractService.generateContracts(params, saveToFile);
      
      const responseMessage = saveToFile && result.filePaths
        ? `Contracts generated and saved to files successfully`
        : 'Contracts generated successfully';
      
      res.status(200).json({
        success: true,
        message: responseMessage,
        contracts: {
          governanceToken: result.governanceToken,
          governanceContract: result.governanceContract
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