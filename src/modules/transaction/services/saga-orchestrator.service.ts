import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices'; // <- Corrección: TS1272 (import type)
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { TransactionRepository } from '../repositories/transaction.repository';
import { SagaStateEnum } from '../domain/enum/transaction.enum';

// Definimos la interfaz del servicio gRPC del Ledger que nos va a responder
interface ReserveFundsResponse {
  success: boolean;
  message: string;
}

interface LedgerGrpcService {
  reserveFunds(data: { transaction_id: string; account_id: string; amount: number }, metadata: Metadata): any;
}

@Injectable()
export class SagaOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private ledgerService: LedgerGrpcService;

  constructor(
    // 1. Inyectamos el cliente gRPC que configuramos en transaction.module.ts
    @Inject('LEDGER_SERVICE') private readonly client: ClientGrpc,
    // 2. Inyectamos nuestro repositorio para actualizar el estado de la saga
    private readonly transactionRepo: TransactionRepository,
  ) {}

  // 3. Este método de NestJS se ejecuta al iniciar el módulo y "enlaza" el cliente con los métodos definidos en el .proto
  onModuleInit() {
    this.ledgerService = this.client.getService<LedgerGrpcService>('LedgerService');
  }

  /**
   * Ejecuta el primer paso de la Saga: Pedirle al Ledger que reserve los fondos.
   * Aquí aplicamos TOLERANCIA A FALLOS (MicroProfile Fault Tolerance).
   */
  async executeTransfer(transactionId: string, sourceAccountId: string, amount: number) {
    this.logger.log(`[Saga] Iniciando transferencia para transacción ${transactionId}`);

    // 4. PREPARACIÓN DE SEGURIDAD (Zero Trust):
    // Creamos los Metadatos gRPC para enviar nuestra llave simétrica.
    const metadata = new Metadata();
    // En producción esto debería venir de process.env, pero por ahora lo quemamos usando la llave que configuraste.
    metadata.add('x-internal-key', process.env.INTERNAL_API_KEY || 'bk_prod_eyU3OThhZjYtOTc1Yy00ZGZhLWI5NGUtYTZmNTM2NWRjZTU5fX0');

    try {
      // 5. LLAMADA gRPC CON RESILIENCIA (RxJS):
      // Construimos el Observable de la petición al Ledger
      const rpcCall = this.ledgerService.reserveFunds({
        transaction_id: transactionId,
        account_id: sourceAccountId,
        amount: amount
      }, metadata);

      // 6. PATRÓN FAULT TOLERANCE:
      const response = (await firstValueFrom(
        rpcCall.pipe(
          // a. TIMEOUT: Si el Ledger no responde en 5000ms (5 segundos), abortamos para no bloquear hilos (Fail Fast).
          timeout(5000), 
          
          // b. RETRY: Si falla (por red o timeout), reintentamos hasta 3 veces automáticamente antes de rendirnos.
          retry(3),      
          
          // c. CATCH ERROR: Si después de los 3 intentos sigue fallando, capturamos el error para manejarlo.
          catchError(err => {
            this.logger.error(`[Saga-Network-Error] El Ledger no responde tras 3 intentos. Detalle: ${err.message}`);
            return throwError(() => err);
          })
        )
      )) as ReserveFundsResponse; // <- Corrección: TS18046

      // 7. MANEJO DE RESPUESTA DE NEGOCIO:
      if (response.success) {
        this.logger.log(`[Saga] Reserva exitosa confirmada por el Ledger para ${transactionId}`);
        // Avanzamos la saga a RESERVED (Corrección: 'saga_state' en lugar de 'state')
        await this.transactionRepo.updateSagaState(transactionId, { saga_state: SagaStateEnum.RESERVED });
        
        // * NOTA: Aquí el Orquestador continuaría con el siguiente paso (ej. enviando dinero al destino).
      } else {
        // El Ledger nos rechazó (ej. fondos insuficientes)
        this.logger.warn(`[Saga] El Ledger rechazó la reserva: ${response.message}`);
        await this.transactionRepo.updateSagaState(transactionId, { saga_state: SagaStateEnum.FAILED });
      }

    } catch (error) {
      // 8. MANEJO DE ERROR CATASTRÓFICO (Saga Abortada):
      // Si la red se cayó y los 3 reintentos fallaron, marcamos la transacción como fallida.
      this.logger.error(`[Saga] Falla crítica al contactar al Ledger. Abortando Saga ${transactionId}.`);
      await this.transactionRepo.updateSagaState(transactionId, { saga_state: SagaStateEnum.FAILED });
    }
  }
}
