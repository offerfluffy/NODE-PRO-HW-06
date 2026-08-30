import { Container } from "./container";
import { METHOD, MethodValue } from "./decorators/methods";
import { PARAM } from "./decorators/params";
import { Router } from "./router";

import http from "node:http";

const isMethodValue = (method: string | undefined): method is MethodValue => {
  return method === METHOD.GET || method === METHOD.POST;
};

export class Dispatcher {
  constructor(
    private container: Container,
    private router: Router,
  ) {}

  async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestMethod = req.method;
    if (!isMethodValue(requestMethod)) {
      this.sendJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    const match = this.router.match(requestMethod, pathname);
    if (match === undefined) {
      this.sendJson(res, 404, { error: "Not Found" });
      return;
    }

    let parsedBody: unknown = undefined;

    if (requestMethod === METHOD.POST) {
      try {
        parsedBody = await this.readBody(req);
      } catch {
        this.sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
    }

    const args: unknown[] = [];
    Object.entries(match.route.params).forEach(([index, metadata]) => {
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
        args[paramIndex] = parsedBody;
      }
    });

    const controllerInstance = this.container.resolve(
      match.route.controller,
    ) as Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
    const result = await controllerInstance[match.route.methodName](...args);

    this.sendJson(res, requestMethod === METHOD.GET ? 200 : 201, result);
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
