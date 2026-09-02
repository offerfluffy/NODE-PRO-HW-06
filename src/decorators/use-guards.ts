import { CanActivate } from "../guards/auth.guard";
import { ROUTE_GUARDS } from "../tokens";

export const UseGuards =
  (...guards: CanActivate[]): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(ROUTE_GUARDS, guards, target, propertyKey);
  };
