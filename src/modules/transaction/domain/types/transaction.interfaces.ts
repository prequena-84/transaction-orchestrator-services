import type { TSagaState, TCurrency } from './transaction.types';

export interface ITransaction {
    transaction_id: string;
    source_account: string;
    target_account: string;
    amount: number;
    currency: TCurrency;
    saga_state: TSagaState;
    failure_reason?: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
