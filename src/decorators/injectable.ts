import "reflect-metadata";
import { INJECTABLE, Scope, SCOPE, ScopeValue } from "../tokens";

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
