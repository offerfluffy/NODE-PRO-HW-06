import { ROUTE_PARAMS } from "../tokens";

export const PARAM = {
  BODY: "body",
  PARAM: "param",
  QUERY: "query",
} as const;
export type ParamValue = (typeof PARAM)[keyof typeof PARAM];

const createRouteParamDecorator = (
  target: Object,
  key: string | symbol | undefined,
  index: number,
  type: ParamValue,
  arg?: string,
) => {
  if (key === undefined) {
    throw new Error("Route parameter decorators can only be used on methods");
  }

  const metadata = Reflect.getMetadata(ROUTE_PARAMS, target) ?? {};

  const methodName = String(key);
  const methodParams = metadata[methodName] ?? {};

  Reflect.defineMetadata(
    ROUTE_PARAMS,
    {
      ...metadata,
      [methodName]: {
        ...methodParams,
        [index]: { type, ...(arg !== undefined ? { name: arg } : {}) },
      },
    },
    target,
  );
};

const Body = (): ParameterDecorator => (target, key, index) => {
  createRouteParamDecorator(target, key, index, PARAM.BODY);
};

const Param =
  (arg: string): ParameterDecorator =>
  (target, key, index) => {
    createRouteParamDecorator(target, key, index, PARAM.PARAM, arg);
  };

const Query =
  (arg: string): ParameterDecorator =>
  (target, key, index) => {
    createRouteParamDecorator(target, key, index, PARAM.QUERY, arg);
  };

export { Body, Param, Query };
