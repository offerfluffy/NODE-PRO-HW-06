import { describe, it } from "node:test";
import Controller from "../src/decorators/controller";
import { Get, Post } from "../src/decorators/methods";
import { Body, Param, Query } from "../src/decorators/params";
import Injectable from "../src/decorators/injectable";
import { Container } from "../src/container";
import { Router } from "../src/router";
import { Dispatcher } from "../src/dispatcher";
import { CreateUserDto, CreateUserSchema } from "../src/dto/create-user.dto";
import { UsePipes } from "../src/decorators/use-pipes";
import { ZodValidationPipe } from "../src/pipes/validation.pipe";
import { UseGuards } from "../src/decorators/use-guards";
import { AuthGuard } from "../src/guards/auth.guard";
import { UseInterceptors } from "../src/decorators/use-interceptors";
import { LoggingInterceptor } from "../src/interceptors/logging.interceptor";
import requestContext from "../src/context/request-context";
import http from "node:http";
import assert from "node:assert/strict";

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

const createTestServer = async (controllers: Ctor[]) => {
  const container = new Container();
  const router = new Router(controllers);
  const dispatcher = new Dispatcher(container, router);
  const server = http.createServer((req, res) => {
    void dispatcher.handle(req, res);
  });
  const port = await listen(server);

  return { server, baseUrl: `http://127.0.0.1:${port}`, container };
};

describe("Dispatcher", () => {
  describe("req resolution", () => {
    it("injects @Param into controller method", async () => {
      @Injectable()
      class UsersService {
        findOne(id: string) {
          return { id };
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Get(":id")
        findOne(@Param("id") id: string) {
          return this.usersService.findOne(id);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users/42`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.id, "42");
      } finally {
        await close(server);
      }
    });

    it("injects @Query into controller method", async () => {
      @Injectable()
      class UsersService {
        findAll(limit: string) {
          return { limit };
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Get("")
        findAll(@Query("limit") limit: string) {
          return this.usersService.findAll(limit);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users?limit=5`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.limit, "5");
      } finally {
        await close(server);
      }
    });

    it("injects @Body into controller method", async () => {
      @Injectable()
      class UsersService {
        create(body: unknown) {
          return { body };
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Post("")
        create(@Body() body: unknown) {
          return this.usersService.create(body);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com" }),
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.deepEqual(body.body, { email: "test@example.com" });
      } finally {
        await close(server);
      }
    });

    it("resolves controller dependencies through the container singleton", async () => {
      @Injectable()
      class UsersService {}

      let singleton: UsersService;

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Get("")
        findAll() {
          return {
            serviceIsSingleton: this.usersService === singleton,
          };
        }
      }

      const { server, baseUrl, container } = await createTestServer([
        UsersController,
      ]);
      singleton = container.resolve(UsersService);

      try {
        const response = await fetch(`${baseUrl}/users`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.serviceIsSingleton, true);
      } finally {
        await close(server);
      }
    });
  });

  describe("validation", () => {
    it("returns 400 with details for invalid DTO body", async () => {
      @Injectable()
      class UsersService {
        create(body: CreateUserDto) {
          return { email: body.email };
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Post("")
        @UsePipes(new ZodValidationPipe(CreateUserSchema))
        create(@Body() body: CreateUserDto) {
          return this.usersService.create(body);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "not-an-email", name: "Ada" }),
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error, "Validation Error");
        assert.match(JSON.stringify(body.fields), /email/);
      } finally {
        await close(server);
      }
    });

    it("passes parsed Zod data to handler for valid body", async () => {
      @Injectable()
      class UsersService {
        create(body: CreateUserDto) {
          return body;
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Post("")
        @UsePipes(new ZodValidationPipe(CreateUserSchema))
        create(@Body() body: CreateUserDto) {
          return this.usersService.create(body);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "ada@example.com",
            name: "Ada",
            role: "admin",
          }),
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.deepEqual(body, {
          email: "ada@example.com",
          name: "Ada",
        });
      } finally {
        await close(server);
      }
    });
  });

  describe("guards", () => {
    it("returns 403 and does not call handler when guard denies request", async () => {
      let handlerCalled = false;

      @Injectable()
      @Controller("secure")
      class SecureController {
        @Get("")
        @UseGuards(new AuthGuard())
        findSecure() {
          handlerCalled = true;
          return { ok: true };
        }
      }

      const { server, baseUrl } = await createTestServer([SecureController]);

      try {
        const response = await fetch(`${baseUrl}/secure`);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.error, "Forbidden");
        assert.equal(handlerCalled, false);
      } finally {
        await close(server);
      }
    });

    it("calls handler when guarded request has Authorization header", async () => {
      let handlerCalled = false;

      @Injectable()
      @Controller("secure")
      class SecureController {
        @Get("")
        @UseGuards(new AuthGuard())
        findSecure() {
          handlerCalled = true;
          return { ok: true };
        }
      }

      const { server, baseUrl } = await createTestServer([SecureController]);

      try {
        const response = await fetch(`${baseUrl}/secure`, {
          headers: { Authorization: "Bearer test" },
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, { ok: true });
        assert.equal(handlerCalled, true);
      } finally {
        await close(server);
      }
    });
  });

  describe("interceptors", () => {
    it("logs method, path, and duration in milliseconds", async () => {
      const logs: string[] = [];
      const originalLog = console.log;

      @Injectable()
      @Controller("users")
      class UsersController {
        @Get(":id")
        @UseInterceptors(new LoggingInterceptor())
        findOne(@Param("id") id: string) {
          return { id };
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };

      try {
        const response = await fetch(`${baseUrl}/users/42`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, { id: "42" });
      } finally {
        console.log = originalLog;
        await close(server);
      }

      assert.match(logs.join("\n"), /GET \/users\/42 - [0-9]+(\.[0-9]+)? ms/);
    });
  });

  describe("request context", () => {
    it("returns X-Request-Id and exposes it inside deep service calls", async () => {
      @Injectable()
      class UsersService {
        async findRequestId() {
          return this.readRequestIdTwoLevelsDeep();
        }

        private async readRequestIdTwoLevelsDeep() {
          await Promise.resolve();
          return requestContext.getRequestId();
        }
      }

      @Injectable()
      @Controller("context")
      class ContextController {
        constructor(private usersService: UsersService) {}

        @Get("")
        async findContext() {
          return { requestId: await this.usersService.findRequestId() };
        }
      }

      const { server, baseUrl } = await createTestServer([ContextController]);

      try {
        const response = await fetch(`${baseUrl}/context`, {
          headers: { "X-Request-Id": "req-from-client" },
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-request-id"), "req-from-client");
        assert.equal(body.requestId, "req-from-client");
      } finally {
        await close(server);
      }
    });

    it("isolates request ids across parallel HTTP requests", async () => {
      const delay = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

      @Injectable()
      @Controller("context")
      class ContextController {
        @Get("")
        async findContext(@Query("delay") delayMs: string) {
          await delay(Number(delayMs));
          return { requestId: requestContext.getRequestId() };
        }
      }

      const { server, baseUrl } = await createTestServer([ContextController]);

      try {
        const results = await Promise.all(
          Array.from({ length: 10 }, async (_, index) => {
            const requestId = `req-${index}`;
            const response = await fetch(
              `${baseUrl}/context?delay=${10 - index}`,
              { headers: { "X-Request-Id": requestId } },
            );
            const body = await response.json();

            return {
              expectedRequestId: requestId,
              responseRequestId: response.headers.get("x-request-id"),
              bodyRequestId: body.requestId,
            };
          }),
        );

        for (const result of results) {
          assert.equal(result.responseRequestId, result.expectedRequestId);
          assert.equal(result.bodyRequestId, result.expectedRequestId);
        }
      } finally {
        await close(server);
      }
    });
  });

  describe("errors", () => {
    it("returns 500 when controller handler throws", async () => {
      @Injectable()
      @Controller("")
      class BoomController {
        @Get("boom")
        boom() {
          throw new Error("boom");
        }
      }

      const { server, baseUrl } = await createTestServer([BoomController]);

      try {
        const response = await fetch(`${baseUrl}/boom`);
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.deepEqual(body, { error: "Internal Server Error" });
      } finally {
        await close(server);
      }
    });
  });
});
