import { AsyncLocalStorage } from "node:async_hooks";

type RequestStore = {
  requestId: string;
};

class RequestContext {
  private storage = new AsyncLocalStorage<RequestStore>();

  run<T>(requestId: string, callback: () => Promise<T>): Promise<T> {
    return this.storage.run({ requestId }, callback);
  }

  getRequestId() {
    const store = this.storage.getStore();

    return store?.requestId;
  }
}

export default new RequestContext();
