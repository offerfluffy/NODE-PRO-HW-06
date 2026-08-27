import "reflect-metadata";
import { INJECTABLE, SCOPE } from "../tokens";

export const Scope = {
  SINGLETON: "singleton",
  TRANSIENT: "transient",
} as const;
export type ScopeValue = (typeof Scope)[keyof typeof Scope];

interface InjectableProps {
  scope: ScopeValue;
}
const Injectable =
  (options?: InjectableProps): ClassDecorator =>
  (ctor) => {
    Reflect.defineMetadata(INJECTABLE, true, ctor);
    Reflect.defineMetadata(SCOPE, options?.scope ?? Scope.SINGLETON, ctor);
  };

export default Injectable;
