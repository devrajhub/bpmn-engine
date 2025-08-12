import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { SSE_ERROR_EVENT, SSE_EVENT_CHANNEL } from './sse.constants';
import { SSEEventDataType } from './sse.interface';
// import { SSE_EVENT_CHANNEL } from './sse.constants';
// import { SSEEventDataType } from './sse.interface';

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly className = SseService.name;
  private listeners: Array<(data: any) => void> = [];

  constructor(
    private readonly loggerService: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.eventEmitter.on(SSE_EVENT_CHANNEL, this.notifyListeners.bind(this));
  }

  private clients: { id: number; response: Response }[] = [];
  private clientId = 0;

  addClient(response: Response): number {
    const id = this.clientId++;
    this.clients.push({ id, response });
    this.loggerService.info(this.className, `Client added: ${id}`);
    return id;
  }

  removeClient(id: number) {
    this.clients = this.clients.filter((client) => client.id !== id);
    this.loggerService.info(this.className, `Client removed: ${id}`);
  }

  // sendEvent(data: any) {
  //   this.clients.forEach((client) => {
  //     try {
  //       client.response.write(`data: ${JSON.stringify(data)}\n\n`);
  //     } catch (error) {
  //       this.loggerService.error(
  //         `Error sending event to client ${client.id}: ${error.message}`,
  //       );
  //       this.removeClient(client.id);
  //     }
  //   });
  //   this.loggerService.info(
  //     `Event sent to ${this.clients.length} clients: ${JSON.stringify(data)}`,
  //   );
  // }

  // Method to emit an SSE event with error handling
  sendEvent(payload: SSEEventDataType) {
    try {
      this.eventEmitter.emit(SSE_EVENT_CHANNEL, payload);
    } catch (error) {
      this.loggerService.error(
        this.className,
        'Error emitting SSE event:',
        error,
      );

      // Emit an error event if sending fails
      this.eventEmitter.emit(SSE_ERROR_EVENT, {
        message: 'Failed to send SSE event',
        error,
        payload,
      });
    }
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((listener) => listener(data));
  }

  // Subscribe a listener to receive messages
  subscribe(listener: (data: any) => void) {
    this.listeners.push(listener);
  }

  // Unsubscribe a listener
  unsubscribe(listener: (data: any) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  // Cleanup listeners when the module is destroyed
  onModuleDestroy() {
    this.listeners = [];
  }

  cleanupClients() {
    this.clients.forEach((client) => {
      if (!client.response.writableEnded) {
        client.response.end();
      }
    });
    this.clients = [];
  }
}
