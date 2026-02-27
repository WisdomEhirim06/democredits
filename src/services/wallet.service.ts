import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { IWallet, ITransaction } from '../interfaces';
import { NotFoundError, InsufficientFundsError, ValidationError } from '../helpers/errors';

export class WalletService {
    /**
     * Get a user's wallet.
     */
    async getWallet(userId: number): Promise<IWallet> {
        const wallet = await db('wallets').where({ user_id: userId }).first();
        if (!wallet) {
            throw new NotFoundError('Wallet not found');
        }
        return wallet;
    }

    /**
     * Get the balance for a user's wallet.
     */
    async getBalance(userId: number): Promise<number> {
        const wallet = await this.getWallet(userId);
        return Number(wallet.balance);
    }

    /**
     * Fund a user's wallet (deposit).
     * Uses a database transaction to ensure atomicity.
     */
    async fund(userId: number, amount: number): Promise<ITransaction> {
        if (amount <= 0) {
            throw new ValidationError('Amount must be greater than zero');
        }

        return db.transaction(async (trx) => {
            const wallet = await trx('wallets')
                .where({ user_id: userId })
                .forUpdate()
                .first();

            if (!wallet) {
                throw new NotFoundError('Wallet not found');
            }

            const balanceBefore = Number(wallet.balance);
            const balanceAfter = balanceBefore + amount;

            await trx('wallets')
                .where({ id: wallet.id })
                .update({ balance: balanceAfter, updated_at: trx.fn.now() });

            const reference = uuidv4();
            const [transactionId] = await trx('transactions').insert({
                wallet_id: wallet.id,
                type: 'funding',
                amount,
                reference,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                metadata: JSON.stringify({ description: 'Wallet funding' }),
            });

            const transaction = await trx('transactions').where({ id: transactionId }).first();
            return transaction;
        });
    }

    /**
     * Transfer funds from one user's wallet to another.
     * Uses a single database transaction to ensure atomicity.
     */
    async transfer(
        senderUserId: number,
        recipientUserId: number,
        amount: number
    ): Promise<{ senderTransaction: ITransaction; recipientTransaction: ITransaction }> {
        if (amount <= 0) {
            throw new ValidationError('Amount must be greater than zero');
        }

        if (senderUserId === recipientUserId) {
            throw new ValidationError('Cannot transfer funds to yourself');
        }

        return db.transaction(async (trx) => {
            // Lock both wallets (ordered by ID to prevent deadlocks)
            const [senderId, recipientId] = senderUserId < recipientUserId
                ? [senderUserId, recipientUserId]
                : [recipientUserId, senderUserId];

            const wallets = await trx('wallets')
                .whereIn('user_id', [senderId, recipientId])
                .forUpdate();

            const senderWallet = wallets.find((w: IWallet) => w.user_id === senderUserId);
            const recipientWallet = wallets.find((w: IWallet) => w.user_id === recipientUserId);

            if (!senderWallet) {
                throw new NotFoundError('Sender wallet not found');
            }
            if (!recipientWallet) {
                throw new NotFoundError('Recipient wallet not found');
            }

            const senderBalanceBefore = Number(senderWallet.balance);
            if (senderBalanceBefore < amount) {
                throw new InsufficientFundsError('Insufficient funds for this transfer');
            }

            const senderBalanceAfter = senderBalanceBefore - amount;
            const recipientBalanceBefore = Number(recipientWallet.balance);
            const recipientBalanceAfter = recipientBalanceBefore + amount;

            const transferReference = uuidv4();

            // Update sender wallet
            await trx('wallets')
                .where({ id: senderWallet.id })
                .update({ balance: senderBalanceAfter, updated_at: trx.fn.now() });

            // Update recipient wallet
            await trx('wallets')
                .where({ id: recipientWallet.id })
                .update({ balance: recipientBalanceAfter, updated_at: trx.fn.now() });

            // Record sender transaction (debit)
            const [senderTxId] = await trx('transactions').insert({
                wallet_id: senderWallet.id,
                type: 'transfer',
                amount: -amount,
                reference: transferReference,
                balance_before: senderBalanceBefore,
                balance_after: senderBalanceAfter,
                metadata: JSON.stringify({
                    direction: 'outgoing',
                    counterparty_user_id: recipientUserId,
                }),
            });

            // Record recipient transaction (credit)
            const recipientReference = uuidv4();
            const [recipientTxId] = await trx('transactions').insert({
                wallet_id: recipientWallet.id,
                type: 'transfer',
                amount,
                reference: recipientReference,
                balance_before: recipientBalanceBefore,
                balance_after: recipientBalanceAfter,
                metadata: JSON.stringify({
                    direction: 'incoming',
                    counterparty_user_id: senderUserId,
                }),
            });

            const senderTransaction = await trx('transactions').where({ id: senderTxId }).first();
            const recipientTransaction = await trx('transactions').where({ id: recipientTxId }).first();

            return { senderTransaction, recipientTransaction };
        });
    }

    /**
     * Withdraw funds from a user's wallet.
     * Uses a database transaction to ensure atomicity.
     */
    async withdraw(userId: number, amount: number): Promise<ITransaction> {
        if (amount <= 0) {
            throw new ValidationError('Amount must be greater than zero');
        }

        return db.transaction(async (trx) => {
            const wallet = await trx('wallets')
                .where({ user_id: userId })
                .forUpdate()
                .first();

            if (!wallet) {
                throw new NotFoundError('Wallet not found');
            }

            const balanceBefore = Number(wallet.balance);
            if (balanceBefore < amount) {
                throw new InsufficientFundsError('Insufficient funds for this withdrawal');
            }

            const balanceAfter = balanceBefore - amount;

            await trx('wallets')
                .where({ id: wallet.id })
                .update({ balance: balanceAfter, updated_at: trx.fn.now() });

            const reference = uuidv4();
            const [transactionId] = await trx('transactions').insert({
                wallet_id: wallet.id,
                type: 'withdrawal',
                amount: -amount,
                reference,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                metadata: JSON.stringify({ description: 'Wallet withdrawal' }),
            });

            const transaction = await trx('transactions').where({ id: transactionId }).first();
            return transaction;
        });
    }

    /**
     * Get transaction history for a user's wallet.
     */
    async getTransactions(userId: number): Promise<ITransaction[]> {
        const wallet = await this.getWallet(userId);
        return db('transactions')
            .where({ wallet_id: wallet.id })
            .orderBy('created_at', 'desc');
    }
}

export default new WalletService();
