import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionCreateDTO } from '../interfaces/dto/transaction.create.dto';
import { TransactionStateDTO } from '../interfaces/dto/transaction.state.dto';
import { SagaStateEnum } from '../domain/enum/transaction.enum';

@Injectable()
export class TransactionRepository {
    constructor(
        @InjectRepository(TransactionEntity)
        private readonly transactionRepository: Repository<TransactionEntity>
    ) {};

    // 1. Crear Transacción (Inicia en PENDING)
    async createTransaction(data: TransactionCreateDTO): Promise<TransactionEntity> {
        const newTransaction = this.transactionRepository.create({
            ...data,
            saga_state: SagaStateEnum.PENDING,
        });
        return this.transactionRepository.save(newTransaction);
    };

    // 2. Buscar Transacción por ID
    async findById(transactionId: string): Promise<TransactionEntity> {
        const transaction = await this.transactionRepository.findOne({
            where: { transaction_id: transactionId }
        });
        if (!transaction) throw new NotFoundException(`No se encontró la transacción ${transactionId}`);
        return transaction;
    };

    // 3. Actualizar Estado de la Saga
    async updateSagaState(transactionId: string, stateData: TransactionStateDTO): Promise<TransactionEntity> {
        const transaction = await this.findById(transactionId);
        transaction.saga_state = stateData.saga_state;
        if (stateData.failure_reason) transaction.failure_reason = stateData.failure_reason;

        return this.transactionRepository.save(transaction);
    };
};
