import { randomUUID } from "node:crypto";
import { Container } from "./container";
import { METHOD, MethodValue } from "./decorators/methods";
import { PARAM } from "./decorators/params";
import { Router } from "./router";

import http from "node:http";
import requestContext from "./context/request-context";
import exceptionFilter from "./filters/exception.filter";
import { ROUTE_GUARDS, ROUTE_INTERCEPTORS, ROUTE_PIPES } from "./tokens";
import { AuthError, NotFoundError, ValidationError } from "./errors";

type RouteMatch = NonNullable<ReturnType<Router["match"]>>;
type ControllerInstance = Record<
  string,
  (...args: unknown[]) => unknown | Promise<unknown>
>;

const isMethodValue = (method: string | undefined): method is MethodValue => {
  return method === METHOD.GET || method === METHOD.POST;
};

export class Dispatcher {
  constructor(
    private container: Container,
    private router: Router,
  ) {}

  async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestId = this.getRequestId(req);

    res.setHeader("X-Request-Id", requestId);

    try {
      await requestContext.run(requestId, async () => {
        await this.dispatch(req, res);
      });
    } catch (error) {
      exceptionFilter.catch(error, res);
    }
  }

  private async dispatch(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestMethod = req.method;
    if (!isMethodValue(requestMethod)) {
      this.sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    const match = this.router.match(requestMethod, pathname);
    if (match === undefined) {
      throw new NotFoundError(
        `Route ${requestMethod} ${pathname} was not found`,
      );
    }

    const guards =
      Reflect.getMetadata(
        ROUTE_GUARDS,
        match.route.controller.prototype,
        match.route.methodName,
      ) ?? [];

    for (const guard of guards) {
      const allowed = await guard.canActivate(req);

      if (!allowed) {
        throw new AuthError();
      }
    }

    const interceptors =
      Reflect.getMetadata(
        ROUTE_INTERCEPTORS,
        match.route.controller.prototype,
        match.route.methodName,
      ) ?? [];

    let next = async () => {
      const parsedBody = await this.parseBody(req, requestMethod);
      const args = await this.buildArgs(match, url, parsedBody);
      return await this.invokeRouteHandler(match, args);
    };

    for (const interceptor of [...interceptors].reverse()) {
      const currentNext = next;
      next = () => interceptor.intercept(req, currentNext);
    }

    const result = await next();

    this.sendJson(res, requestMethod === METHOD.GET ? 200 : 201, result);
  }

  private async parseBody(req: http.IncomingMessage, requestMethod: string) {
    let parsedBody: unknown = undefined;

    if (requestMethod === METHOD.POST) {
      try {
        parsedBody = await this.readBody(req);
      } catch {
        throw new ValidationError([]);
      }
    }

    return parsedBody;
  }

  private async buildArgs(match: RouteMatch, url: URL, parsedBody: unknown) {
    const args: unknown[] = [];

    for (const [index, metadata] of Object.entries(match.route.params)) {
      const paramIndex = Number(index);

      if (metadata.type === PARAM.PARAM) {
        if (metadata.name === undefined)
          throw new Error("Param metadata requires a name");

        args[paramIndex] = match.pathParams[metadata.name];
      } else if (metadata.type === PARAM.QUERY) {
        if (metadata.name === undefined)
          throw new Error("Query metadata requires a name");

        args[paramIndex] = url.searchParams.get(metadata.name);
      } else if (metadata.type === PARAM.BODY) {
        const pipes =
          Reflect.getMetadata(
            ROUTE_PIPES,
            match.route.controller.prototype,
            match.route.methodName,
          ) ?? [];

        let bodyArg = parsedBody;

        for (const pipe of pipes) {
          bodyArg = await pipe.transform(bodyArg);
        }

        args[paramIndex] = bodyArg;
      }
    }

    return args;
  }

  private async invokeRouteHandler(match: RouteMatch, args: unknown[]) {
    const controllerInstance = this.container.resolve(
      match.route.controller,
    ) as ControllerInstance;

    return controllerInstance[match.route.methodName](...args);
  }

  private getRequestId(req: http.IncomingMessage) {
    const header = req.headers["x-request-id"];

    if (Array.isArray(header) && header[0]) return header[0];

    if (typeof header === "string" && header.length > 0) return header;

    return randomUUID();
  }

  private readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      req.on("data", (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      req.on("end", () => {
        const rawBody = Buffer.concat(chunks).toString("utf8");

        if (rawBody.length === 0) {
          resolve(undefined);
          return;
        }

        try {
          resolve(JSON.parse(rawBody));
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });

      req.on("error", reject);
    });
  }

  private sendJson(
    res: http.ServerResponse,
    statusCode: number,
    body: unknown,
  ) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
    });

    res.end(JSON.stringify(body));
  }
}
