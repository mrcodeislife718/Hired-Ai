export type IntegrationFailureClass = 'auth' | 'rate_limit' | 'validation' | 'conflict' | 'transient' | 'permanent' | 'unknown';

export interface RecoverableIntegrationError {
  class: IntegrationFailureClass;
  message: string;
  retryable: boolean;
  safeRetryAt?: string;
  requiredPermission?: string;
  correctedInput?: Record<string, unknown>;
  sideEffectsKnown: boolean;
  idempotencyKey?: string;
}

export interface IntegrationResponse<T> {
  ok: boolean;
  value?: T;
  error?: RecoverableIntegrationError;
  externalReference?: string;
}

export class RecoverableIntegration<TInput extends Record<string, unknown>, TOutput> {
  constructor(
    readonly name: string,
    private readonly executeFn: (input: TInput, context: { idempotencyKey: string }) => Promise<IntegrationResponse<TOutput>>,
  ) {}

  async execute(input: TInput, { idempotencyKey, maxRetries = 2 }: { idempotencyKey: string; maxRetries?: number }): Promise<IntegrationResponse<TOutput> & { attempts: number }> {
    if (!idempotencyKey) throw new Error('idempotencyKey is required for external career actions');
    let attempts = 0;
    let currentInput = structuredClone(input);
    while (attempts <= maxRetries) {
      attempts += 1;
      const result = await this.executeFn(currentInput, { idempotencyKey });
      if (result.ok) return { ...result, attempts };
      const error = result.error;
      if (!error) throw new Error(`${this.name} returned an unsuccessful response without recovery metadata`);
      if (!error.retryable || attempts > maxRetries) return { ...result, attempts };
      if (error.correctedInput) currentInput = { ...currentInput, ...error.correctedInput };
      if (error.safeRetryAt && Date.now() < new Date(error.safeRetryAt).getTime()) return { ...result, attempts };
      if (!error.sideEffectsKnown && !error.idempotencyKey) return { ...result, attempts };
    }
    throw new Error('unreachable integration retry state');
  }
}
