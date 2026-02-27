export interface IUser {
    id?: number;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface IWallet {
    id?: number;
    user_id: number;
    balance: number;
    created_at?: Date;
    updated_at?: Date;
}

export type TransactionType = 'funding' | 'transfer' | 'withdrawal';

export interface ITransaction {
    id?: number;
    wallet_id: number;
    type: TransactionType;
    amount: number;
    reference: string;
    balance_before: number;
    balance_after: number;
    metadata?: Record<string, unknown> | null;
    created_at?: Date;
}

export interface ICreateUserDTO {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
}

export interface ILoginDTO {
    email: string;
    password: string;
}

export interface IFundDTO {
    amount: number;
}

export interface ITransferDTO {
    recipient_email: string;
    amount: number;
}

export interface IWithdrawDTO {
    amount: number;
}

export interface IAuthPayload {
    userId: number;
    email: string;
}
