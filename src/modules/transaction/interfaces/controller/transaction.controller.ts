import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus, HttpException, BadRequestException } from '@nestjs/common';
import { TransactionRepository } from '../../repositories/transaction.repository';
import { TransactionCreateDTO } from '../dto/transaction.create.dto';
import { TransactionStateDTO } from '../dto/transaction.state.dto';
import { TransactionEntity } from '../../domain/transaction.entity';
import { SagaOrchestratorService } from '../../services/saga-orchestrator.service';

@Controller('api/v1/transactions')
export class TransactionController {
    constructor(
        private readonly transactionRepository: TransactionRepository,
        // Inyectamos nuestro servicio de Orquestación (Saga)
        private readonly sagaOrchestrator: SagaOrchestratorService,
    ) { };

    /**
     * Endpoint: POST /api/v1/transactions
     * Propósito: Inicia una nueva transacción (Saga)
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTransaction(@Body() body: TransactionCreateDTO): Promise<TransactionEntity> {
        try {
            console.log("[POST] Crear Transacción", body);
            // 1. Guardamos la transacción inicial con estado PENDING en nuestra base de datos local
            const transaction = await this.transactionRepository.createTransaction(body);

            // 2. Disparamos la Saga Asíncronamente (¡Nota que no tiene 'await'!)
            // Esto permite que el Controller le responda rápido al frontend (HTTP 201),
            // mientras que el proceso gRPC y los reintentos ocurren en segundo plano.
            this.sagaOrchestrator.executeTransfer(
                transaction.transaction_id, 
                transaction.source_account, 
                Number(transaction.amount)
            ).catch(err => {
                // Atrapamos silenciosamente si la Saga muere completamente en background
                console.error('Error no capturado en la Saga:', err);
            });

            // 3. Retornamos la respuesta HTTP 201 Created inmediatamente al usuario
            return transaction;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new BadRequestException('Error al iniciar la transacción');
        };
    };

    /**
     * Endpoint: GET /api/v1/transactions/:transaction_id
     * Propósito: Consultar el estado de la saga (Polling para el frontend)
     */
    @Get(':transaction_id')
    @HttpCode(HttpStatus.OK)
    async getTransaction(@Param('transaction_id', new ParseUUIDPipe()) transactionId: string): Promise<TransactionEntity> {
        try {
            return this.transactionRepository.findById(transactionId);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new BadRequestException('Error al obtener la transacción');
        };
    };

    /**
     * Endpoint: PATCH /api/v1/transactions/:transaction_id/state
     * Propósito: Actualizar el estado de la saga (Uso interno/Webhooks)
     */
    @Patch(':transaction_id/state')
    @HttpCode(HttpStatus.OK)
    async updateState(
        @Param('transaction_id', new ParseUUIDPipe()) transactionId: string,
        @Body() body: TransactionStateDTO
    ): Promise<TransactionEntity> {
        try {
            return this.transactionRepository.updateSagaState(transactionId, body);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new BadRequestException('Error al actualizar el estado de la transacción');
        };
    };
};