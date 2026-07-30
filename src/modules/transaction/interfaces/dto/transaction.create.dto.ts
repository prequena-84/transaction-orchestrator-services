import { IsString, IsNotEmpty, IsNumber, IsPositive, IsEnum } from 'class-validator';
import { CurrencyEnum } from '../../domain/enum/transaction.enum';
import type { ITransaction } from '../../domain/types/transaction.interfaces';
import type { TCurrency } from '../../domain/types/transaction.types';

export class TransactionCreateDTO implements Pick<ITransaction, 'source_account' | 'target_account' | 'amount' | 'currency'> {
    @IsString()
    @IsNotEmpty()
    source_account: string;

    @IsString()
    @IsNotEmpty()
    target_account: string;

    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    amount: number;

    @IsEnum(CurrencyEnum)
    @IsNotEmpty()
    currency: TCurrency;
};