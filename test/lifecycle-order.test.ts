import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { Container } from "../src/container";
import Controller from "../src/decorators/controller";
import Injectable from "../src/decorators/injectable";
import { Post } from "../src/decorators/methods";
import { Body } from "../src/decorators/params";
import { UseGuards } from "../src/decorators/use-guards";
import { UseInterceptors } from "../src/decorators/use-interceptors";
import { UsePipes } from "../src/decorators/use-pipes";
import { CanActivate } from "../src/guards/auth.guard";
import { NestInterceptor } from "../src/interceptors/logging.interceptor";
import { Dispatcher } from "../src/dispatcher";
import { Router } from "../src/router";

type Ctor<T = unknown> = new (...args: any[]) => T;

const listen = (server: http.Server) =>
  new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (address === null || typeof address === "string") {
        throw new Error("Server did not expose a TCP port");
      }

      resolve(address.port);
    });
  });

const close = (server: http.Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const createTestServer = async (
  controllers: Ctor[],
  calls: string[],
) => {
  const container = new Container();
  const router = new Router(controllers);
  const dispatcher = new Dispatcher(container, router);
  const server = http.createServer((req, res) => {
    calls.push("middleware");
    void dispatcher.handle(req, res);
  });
  const port = await listen(server);

  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

describe("request lifecycle order", () => {
  it("runs middleware, guard, interceptor, pipe, handler, then interceptor after", async () => {
    const calls: string[] = [];

    class OrderGuard implements CanActivate {
      canActivate() {
        calls.push("guard");
        return true;
      }
    }

    class OrderInterceptor implements NestInterceptor {
      async intercept(_req: http.IncomingMessage, next: () => Promise<unknown>) {
        calls.push("interceptor:before");
        const result = await next();
        calls.push("interceptor:after");
        return result;
      }
    }

    class OrderPipe {
      transform(value: unknown) {
        calls.push("pipe");
        return value;
      }
    }

    @Injectable()
    @Controller("order")
    class OrderController {
      @Post("")
      @UseGuards(new OrderGuard())
      @UseInterceptors(new OrderInterceptor())
      @UsePipes(new OrderPipe())
      create(@Body() body: unknown) {
        calls.push("handler");
        return body;
      }
    }

    const { server, baseUrl } = await createTestServer(
      [OrderController],
      calls,
    );

    try {
      const response = await fetch(`${baseUrl}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      });

      assert.equal(response.status, 201);
    } finally {
      await close(server);
    }

    assert.deepEqual(calls, [
      "middleware",
      "guard",
      "interceptor:before",
      "pipe",
      "handler",
      "interceptor:after",
    ]);
  });
});
