import "reflect-metadata";
import { CONTROLLER_PREFIX } from "../tokens";

const Controller =
  (path: string): ClassDecorator =>
  (ctor) => {
    Reflect.defineMetadata(CONTROLLER_PREFIX, path, ctor);
  };

export default Controller;
