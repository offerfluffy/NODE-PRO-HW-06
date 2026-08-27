export const INJECTABLE = Symbol("injectable");
export const INJECT = Symbol("inject");
export const SCOPE = Symbol("scope");

export const Scope = {
  SINGLETON: "singleton",
  TRANSIENT: "transient",
} as const;
export type ScopeValue = (typeof Scope)[keyof typeof Scope];
