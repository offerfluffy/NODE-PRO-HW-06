import "reflect-metadata";

import { describe, it } from "node:test";
import assert from "node:assert";
import Controller from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Param } from "../src/decorators/params";
import { Router } from "../src/router";

describe("Router", () => {
  describe("route matching", () => {
    it("matches a controller route and extracts path parameters", () => {
      @Controller("users")
      class UsersController {
        @Get(":id")
        findOne(@Param("id") id: string) {}
      }

      const router = new Router([UsersController]);
      const match = router.match("GET", "/users/42");

      assert.ok(match?.route.methodName === "findOne");
      assert.ok(match?.pathParams.id === "42");
    });
  });
});
