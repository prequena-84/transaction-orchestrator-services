import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { TransactionEntity } from './domain/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionController } from './interfaces/controller/transaction.controller';
import { SagaOrchestratorService } from './services/saga-orchestrator.service';

@Module({
  imports: [
    // 1. Registro de la Entidad en TypeORM
    TypeOrmModule.forFeature([TransactionEntity]),

    // 2. Conexión GRPC al Ledger (Puerto 50051)
    ClientsModule.register([
      {
        name: 'LEDGER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'ledger',
          protoPath: join(process.cwd(), 'src/proto/ledger_service.proto'), // Usamos process.cwd() como acordamos antes
          // Usamos 'development' (nombre del contenedor) para que Docker lo resuelva, o IP/localhost
          url: 'account-ledger-service-development:50051', 
        },
      },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionRepository, SagaOrchestratorService],
  exports: [TransactionRepository, SagaOrchestratorService], // Exportado por si otro módulo necesita consultarlo
})
export class TransactionModule { };