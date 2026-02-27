import { Router } from 'express';
import walletController from '../controllers/wallet.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware);

router.post(
    '/fund',
    validate({
        amount: { required: true, type: 'number', min: 0.01 },
    }),
    walletController.fund
);

router.post(
    '/transfer',
    validate({
        recipient_email: { required: true, type: 'email' },
        amount: { required: true, type: 'number', min: 0.01 },
    }),
    walletController.transfer
);

router.post(
    '/withdraw',
    validate({
        amount: { required: true, type: 'number', min: 0.01 },
    }),
    walletController.withdraw
);

router.get('/balance', walletController.getBalance);

router.get('/transactions', walletController.getTransactions);

export default router;
