export const INJECTABLE = Symbol("injectable");
export const INJECT = Symbol("inject");
export const SCOPE = Symbol("scope");
export const CONTROLLER_PREFIX = Symbol("controller_prefix");
export const ROUTES = Symbol("routes");
export const ROUTE_PARAMS = Symbol("route_params");
export const ROUTE_PIPES = Symbol("route_pipes");
export const ROUTE_GUARDS = Symbol("route_guards");
export const ROUTE_INTERCEPTORS = Symbol("route_interceptors");

export const Scope = {
  SINGLETON: "singleton",
  TRANSIENT: "transient",
} as const;
export type ScopeValue = (typeof Scope)[keyof typeof Scope];
