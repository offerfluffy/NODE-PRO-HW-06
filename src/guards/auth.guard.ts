import http from "node:http";

export interface CanActivate {
  canActivate(req: http.IncomingMessage): boolean | Promise<boolean>;
}

export class AuthGuard implements CanActivate {
  canActivate(req: http.IncomingMessage): boolean {
    const header = req.headers.authorization;
    return typeof header === "string" && header.length > 0;
  }
}

export const authGuard = new AuthGuard();
