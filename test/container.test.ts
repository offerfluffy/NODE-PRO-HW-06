import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";

import { Container } from "../src/container";
import Injectable from "../src/decorators/injectable";
import Inject from "../src/decorators/inject";

test("resolves simple dependency graph through design:paramtypes", () => {
  @Injectable()
  class C {}

  @Injectable()
  class B {
    constructor(public c: C) {}
  }

  @Injectable()
  class A {
    constructor(public b: B) {}
  }

  const container = new Container();
  const a = container.resolve(A);

  assert.ok(a instanceof A);
  assert.ok(a.b instanceof B);
  assert.ok(a.b.c instanceof C);
});

test("resolves circular dependency graph with clear Error", () => {
  @Injectable()
  class A {
    constructor(b: any) {}
  }
  @Injectable()
  class B {
    constructor(a: A) {}
  }
  Reflect.defineMetadata("design:paramtypes", [B], A);

  const container = new Container();

  assert.throws(() => container.resolve(A), /A -> B -> A/);
});

test("resolves dependency graph with interface using @Inject token", () => {
  const CONFIG = Symbol.for("CONFIG");

  interface Config {
    url: string;
  }

  const configValue: Config = { url: "postgres://test" };

  @Injectable()
  class Service {
    constructor(@Inject(CONFIG) public config: Config) {}
  }

  const container = new Container();
  container.registerValue(CONFIG, configValue);

  const service = container.resolve(Service);

  assert.equal(service.config, configValue);
  assert.equal(service.config.url, "postgres://test");
});

test("singleton produces same instances", () => {
  @Injectable()
  class C {}

  const container = new Container();
  const c1 = container.resolve(C);
  const c2 = container.resolve(C);

  assert.ok(c1 === c2);
});

test("transient produces different instances", () => {
  @Injectable({ scope: "transient" })
  class C {}

  const container = new Container();
  const c1 = container.resolve(C);
  const c2 = container.resolve(C);

  assert.ok(c1 !== c2);
});
