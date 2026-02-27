import { Request, Response, NextFunction } from 'express';
import walletService from '../services/wallet.service';
import userService from '../services/user.service';
import { successResponse } from '../helpers/response';
import { UnauthorizedError } from '../helpers/errors';

export class WalletController {
    /**
     * POST /api/wallet/fund
     */
    async fund(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw new UnauthorizedError();
            const { amount } = req.body;
            const transaction = await walletService.fund(req.user.userId, Number(amount));

            successResponse(res, 'Wallet funded successfully', { transaction }, 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/wallet/transfer
     */
    async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw new UnauthorizedError();
            const { recipient_email, amount } = req.body;

            // Find recipient by email
            const recipient = await userService.findByEmail(recipient_email);

            const result = await walletService.transfer(
                req.user.userId,
                recipient.id!,
                Number(amount)
            );

            successResponse(res, 'Transfer successful', {
                transaction: result.senderTransaction,
            }, 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/wallet/withdraw
     */
    async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw new UnauthorizedError();
            const { amount } = req.body;
            const transaction = await walletService.withdraw(req.user.userId, Number(amount));

            successResponse(res, 'Withdrawal successful', { transaction }, 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/wallet/balance
     */
    async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw new UnauthorizedError();
            const balance = await walletService.getBalance(req.user.userId);

            successResponse(res, 'Balance retrieved', { balance });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/wallet/transactions
     */
    async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw new UnauthorizedError();
            const transactions = await walletService.getTransactions(req.user.userId);

            successResponse(res, 'Transactions retrieved', { transactions });
        } catch (error) {
            next(error);
        }
    }
}

export default new WalletController();
