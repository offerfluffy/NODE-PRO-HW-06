import http from "node:http";

export interface NestInterceptor {
  intercept(
    req: http.IncomingMessage,
    next: () => Promise<unknown>,
  ): Promise<unknown>;
}

export class LoggingInterceptor implements NestInterceptor {
  async intercept(req: http.IncomingMessage, next: () => Promise<unknown>) {
    const start = performance.now();

    try {
      return await next();
    } finally {
      const duration = performance.now() - start;
      console.log(`${req.method} ${req.url} - ${duration.toFixed(1)} ms`);
    }
  }
}
