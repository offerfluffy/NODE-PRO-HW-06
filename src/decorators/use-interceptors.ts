import { NestInterceptor } from "../interceptors/logging.interceptor";
import { ROUTE_INTERCEPTORS } from "../tokens";

export const UseInterceptors =
  (...interceptors: NestInterceptor[]): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(
      ROUTE_INTERCEPTORS,
      interceptors,
      target,
      propertyKey,
    );
  };
