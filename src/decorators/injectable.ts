import "reflect-metadata";
import { INJECTABLE, SCOPE } from "../tokens";

interface InjectableProps {
  scope: "singleton" | "transient";
}
const Injectable =
  (options?: InjectableProps): ClassDecorator =>
  (ctor) => {
    Reflect.defineMetadata(INJECTABLE, true, ctor);
    Reflect.defineMetadata(SCOPE, options?.scope ?? "singleton", ctor);
  };

export default Injectable;
