import http from "node:http";
import { NotFoundError, ValidationError } from "../errors";

class ExceptionFilter {
  catch(error: unknown, res: http.ServerResponse) {
    if (error instanceof NotFoundError) {
      this.sendJson(res, 404, { error: "Not Found", message: error.message });
    } else if (error instanceof ValidationError) {
      this.sendJson(res, 400, {
        error: "Validation Error",
        fields: error.fields,
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
