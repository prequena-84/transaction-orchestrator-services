import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { SagaStateEnum } from '../../domain/enum/transaction.enum';
import type { ITransaction } from '../../domain/types/transaction.interfaces';
import type { TSagaState } from '../../domain/types/transaction.types';

export class TransactionStateDTO implements Pick<ITransaction, 'saga_state'> {
    @IsEnum(SagaStateEnum)
    @IsNotEmpty()
    saga_state: TSagaState;

    @IsString()
    @IsOptional()
    failure_reason?: string;
};