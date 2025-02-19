// src/routes/contractRoutes.ts
import { Router } from 'express';
import { ContractController } from '../controllers/contractController';

const router: Router = Router();
const contractController = new ContractController();

/**
 * @route POST /api/contracts/generate
 * @desc Generate governance contracts based on parameters
 * @access Public
 */
router.post(
  '/generate',
  contractController.validateContractGeneration,
  contractController.generateContracts
);

export default router;