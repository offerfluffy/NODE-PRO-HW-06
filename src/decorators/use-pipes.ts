import "reflect-metadata";
import { ROUTE_PIPES } from "../tokens";

export const UsePipes =
  (...pipes: unknown[]): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(ROUTE_PIPES, pipes, target, propertyKey);
  };
