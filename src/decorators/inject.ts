import "reflect-metadata";
import { INJECT } from "../tokens";

const Inject =
  (token: symbol | string): ParameterDecorator =>
  (target, _key, index) => {
    const metadata = Reflect.getMetadata(INJECT, target) ?? {};
    Reflect.defineMetadata(INJECT, { ...metadata, [index]: token }, target);
  };

export default Inject;
