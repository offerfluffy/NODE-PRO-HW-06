import { INJECT, INJECTABLE, Scope, SCOPE } from "./tokens";

type Ctor<T = unknown> = new (...args: any[]) => T;

export class Container {
  private singletons = new Map<Ctor, unknown>();
  private registry = new Map<symbol | string, any>();

  registerValue(token: symbol | string, value: any) {
    if (this.registry.has(token))
      throw new Error(
        `provider already registered for token ${String(token)} `,
      );

    this.registry.set(token, value);
  }

  resolve<T>(target: Ctor<T> | symbol | string, path: string[] = []): T {
    if (typeof target === "symbol" || typeof target === "string") {
      if (this.registry.has(target)) {
        return this.registry.get(target);
      }

      throw new Error(`${String(target)} has no provider`);
    }

    if (path.includes(target.name)) {
      throw new Error(`circular deps: ${[...path, target.name].join(" -> ")}`);
    }

    if (this.singletons.has(target)) return this.singletons.get(target) as T;

    if (!Reflect.getMetadata(INJECTABLE, target)) {
      throw new Error(`${target.name} not marked by @Injectable()`);
    }

    const deps = (Reflect.getMetadata("design:paramtypes", target) ??
      []) as Ctor[];
    const injectTokens = Reflect.getMetadata(INJECT, target) ?? {};

    const args = deps.map((designType, index) => {
      const token = injectTokens[index] ?? designType;
      return this.resolve(token, [...path, target.name]);
    });
    const instance = new target(...args);

    const isSingleton = Reflect.getMetadata(SCOPE, target) === Scope.SINGLETON;
    if (isSingleton) this.singletons.set(target, instance);

    return instance;
  }
}
