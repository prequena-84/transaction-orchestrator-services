import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import type { ITransaction } from './types/transaction.interfaces';
import { SagaStateEnum, CurrencyEnum } from './enum/transaction.enum';

@Entity('TRANSACTION')
export class TransactionEntity implements ITransaction {
    @PrimaryGeneratedColumn('uuid')
    transaction_id: string;

    @Column({ 
        type: 'varchar', 
        length: 50, 
        nullable: false,
     })
    source_account: string;

    @Column({ 
        type: 'varchar', 
        length: 50, 
        nullable: false,
     })
    target_account: string;

    @Column({ 
        type: 'decimal', 
        precision: 12, 
        scale: 2, 
        nullable: false, 
        default: 0,
    })
    amount: number;

    @Column({ 
        type: 'enum', 
        enum: CurrencyEnum, 
        default: CurrencyEnum.USD, 
        nullable: false,
     })
    currency: CurrencyEnum;

    @Column({ 
        type: 'enum', 
        enum: SagaStateEnum, 
        default: SagaStateEnum.PENDING, 
        nullable: false,
     })
    saga_state: SagaStateEnum;

    @Column({ 
        type: 'text', 
        nullable: true,
    })
    failure_reason?: string | null;

    @CreateDateColumn({ 
        type: 'timestamp', 
        precision: 3, 
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @UpdateDateColumn({ 
        type: 'timestamp', 
        precision: 3, 
        default: () => 'CURRENT_TIMESTAMP', 
    })
    updatedAt: Date;

    @DeleteDateColumn({ 
        type: 'timestamp',
        precision: 3,
        nullable: true,
    })
    deletedAt?: Date | null;
}
