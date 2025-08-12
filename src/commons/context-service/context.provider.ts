import { ContextService } from './context.service';

export class ContextProvider {
  private static contextService: ContextService;

  static setContextService(contextService: ContextService) {
    this.contextService = contextService;
  }

  static getContextService(): ContextService {
    if (!this.contextService) {
      throw new Error('ContextService has not been set');
    }
    return this.contextService;
  }
}
