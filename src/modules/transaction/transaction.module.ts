import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { TransactionEntity } from './domain/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionController } from './interfaces/controller/transaction.controller';

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
          url: '[IP_ADDRESS]', // Usamos la IP del host para conectar con la Mac - 'localhost:5000',
        },
      },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionRepository],
  exports: [TransactionRepository], // Exportado por si otro módulo necesita consultarlo
})
export class TransactionModule { };