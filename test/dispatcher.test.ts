import { describe, it } from "node:test";
import Controller from "../src/decorators/controller";
import { Get, Post } from "../src/decorators/methods";
import { Body, Param, Query } from "../src/decorators/params";
import Injectable from "../src/decorators/injectable";
import { Container } from "../src/container";
import { Router } from "../src/router";
import { Dispatcher } from "../src/dispatcher";
import { CreateUserDto } from "../src/dto/create-user.dto";
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
        assert.match(JSON.stringify(body), /email/);
      } finally {
        await close(server);
      }
    });

    it("passes DTO instance to handler for valid body", async () => {
      @Injectable()
      class UsersService {
        create(body: CreateUserDto) {
          return {
            email: body.email,
            isDto: body instanceof CreateUserDto,
          };
        }
      }

      @Injectable()
      @Controller("users")
      class UsersController {
        constructor(private usersService: UsersService) {}

        @Post("")
        create(@Body() body: CreateUserDto) {
          return this.usersService.create(body);
        }
      }

      const { server, baseUrl } = await createTestServer([UsersController]);

      try {
        const response = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "ada@example.com", name: "Ada" }),
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.equal(body.email, "ada@example.com");
        assert.equal(body.isDto, true);
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
