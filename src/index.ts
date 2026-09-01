import http from "node:http";

import { Container } from "./container";
import Controller from "./decorators/controller";
import Injectable from "./decorators/injectable";
import { Get } from "./decorators/methods";
import { Dispatcher } from "./dispatcher";
import { Router } from "./router";

@Injectable()
@Controller("")
class AppController {
  @Get("")
  health() {
    return { ok: true };
  }
}

const container = new Container();
const router = new Router([AppController]);
const dispatcher = new Dispatcher(container, router);

const server = http.createServer((req, res) => {
  void dispatcher.handle(req, res);
});

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
