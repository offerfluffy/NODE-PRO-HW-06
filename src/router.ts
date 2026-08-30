import "reflect-metadata";

import { MethodValue } from "./decorators/methods";
import { ParamValue } from "./decorators/params";
import { CONTROLLER_PREFIX, ROUTE_PARAMS, ROUTES } from "./tokens";

type Ctor<T = unknown> = new (...args: any[]) => T;

type ParamMetadata = {
  type: ParamValue;
  name?: string;
};

type RouteDefinition = {
  requestMethod: MethodValue;
  fullPath: string;
  controller: Ctor;
  methodName: string;
  params: Record<number, ParamMetadata>;
};

type RouteMatch = {
  route: RouteDefinition;
  pathParams: Record<string, string>;
};

const joinPaths = (prefix: string, path: string) => {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const cleanPath = path.replace(/^\/+|\/+$/g, "");

  return "/" + [cleanPrefix, cleanPath].filter(Boolean).join("/");
};

export class Router {
  private routes: RouteDefinition[];

  constructor(controllers: Ctor[]) {
    this.routes = this.collectRoutes(controllers);
  }

  collectRoutes(controllers: Ctor[]): RouteDefinition[] {
    const result: RouteDefinition[] = [];

    for (const controller of controllers) {
      const prefix = Reflect.getMetadata(CONTROLLER_PREFIX, controller);

      if (prefix === undefined) continue;

      const routes = Reflect.getMetadata(ROUTES, controller.prototype) ?? [];
      const params =
        Reflect.getMetadata(ROUTE_PARAMS, controller.prototype) ?? {};

      for (const route of routes) {
        result.push({
          requestMethod: route.requestMethod,
          fullPath: joinPaths(prefix, route.path),
          controller,
          methodName: String(route.methodName),
          params: params[String(route.methodName)] ?? {},
        });
      }
    }

    return result;
  }

  match(method: MethodValue, pathname: string): RouteMatch | undefined {
    for (const route of this.routes) {
      if (route.requestMethod !== method) continue;

      const routeArr = route.fullPath.split("/").filter(Boolean);
      const pathnameArr = pathname.split("/").filter(Boolean);

      if (routeArr.length !== pathnameArr.length) continue;

      let pathParams: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < routeArr.length; i++) {
        if (routeArr[i].startsWith(":")) {
          pathParams = {
            ...pathParams,
            [routeArr[i].replace(":", "")]: pathnameArr[i],
          };
        } else if (routeArr[i] !== pathnameArr[i]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { route, pathParams };
      }
    }

    return undefined;
  }
}
