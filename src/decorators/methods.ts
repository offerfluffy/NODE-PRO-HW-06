import { ROUTES } from "../tokens";

const METHOD = {
  GET: "GET",
  POST: "POST",
} as const;
type MethodValue = (typeof METHOD)[keyof typeof METHOD];

const createRouteDecorator = (
  target: Object,
  key: string | symbol,
  path: string,
  requestMethod: MethodValue,
) => {
  const metadata = Reflect.getMetadata(ROUTES, target) ?? [];
  Reflect.defineMetadata(
    ROUTES,
    [...metadata, { methodName: key, requestMethod, path }],
    target,
  );
};

const Get =
  (path: string): MethodDecorator =>
  (target, key, _d) => {
    createRouteDecorator(target, key, path, METHOD.GET);
  };

const Post =
  (path: string): MethodDecorator =>
  (target, key, _d) => {
    createRouteDecorator(target, key, path, METHOD.POST);
  };

export { Get, Post };
