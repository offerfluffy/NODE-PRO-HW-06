import http from "node:http";
import { AuthError, NotFoundError, ValidationError } from "../errors";

class ExceptionFilter {
  catch(error: unknown, res: http.ServerResponse) {
    if (error instanceof NotFoundError) {
      this.sendJson(res, error.statusCode, {
        error: "Not Found",
        message: error.message,
      });
    } else if (error instanceof ValidationError) {
      this.sendJson(res, error.statusCode, {
        error: "Validation Error",
        fields: error.fields,
      });
    } else if (error instanceof AuthError) {
      this.sendJson(res, error.statusCode, {
        error: "Forbidden",
        message: error.message,
      });
    } else {
      this.sendJson(res, 500, { error: "Internal Server Error" });
    }
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

export default new ExceptionFilter();
