import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient, type ApiResult } from "@/lib/api/client";
import { privateKey } from "@/lib/query/keys";
import type { components } from "@/lib/api/generated/schema";

export type User = components["schemas"]["User"];
type Status =
  | "restoring"
  | "authenticated"
  | "anonymous"
  | "unavailable"
  | "signing-out"
  | "logout-failed";
function runtime(epoch: number, unauthorized: () => void) {
  const controller = new AbortController();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  return {
    epoch,
    controller,
    queryClient,
    api: createApiClient(controller.signal, unauthorized),
  };
}
type Snapshot = {
  status: Status;
  user: User | null;
  notice?: string;
  error?: unknown;
  runtime: ReturnType<typeof runtime>;
};

// One instance per mounted browser provider; never a server/global singleton.
export class SessionStore {
  private listeners = new Set<() => void>();
  private epoch = 0;
  private snapshot: Snapshot;
  private announce: () => void = () => {};
  setAnnounce(callback: () => void) {
    this.announce = callback;
  }
  constructor() {
    this.snapshot = {
      status: "restoring",
      user: null,
      runtime: this.newRuntime(),
    };
  }
  private newRuntime() {
    const epoch = ++this.epoch;
    return runtime(epoch, () => {
      if (this.snapshot.runtime.epoch === epoch) {
        this.replace("anonymous", "会话已失效，请重新登录。");
      }
    });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(value: Snapshot) {
    this.snapshot = value;
    this.listeners.forEach((listener) => listener());
  }
  private replace(status: Status, notice?: string) {
    const old = this.snapshot.runtime;
    old.controller.abort();
    void old.queryClient.cancelQueries();
    old.queryClient.clear();
    const next = this.newRuntime();
    this.publish({ status, user: null, notice, runtime: next });
    return next;
  }
  private current(value: ReturnType<typeof runtime>) {
    return value === this.snapshot.runtime && !value.controller.signal.aborted;
  }
  private authenticate(
    value: ReturnType<typeof runtime>,
    result: ApiResult<"/api/v1/me", "get">,
  ) {
    if (!this.current(value)) return;
    value.queryClient.setQueryData(
      privateKey(value.epoch, result.data.user.id, "me"),
      result,
    );
    this.publish({
      status: "authenticated",
      user: result.data.user,
      runtime: value,
    });
  }
  restore = async () => {
    const wasAuthenticated = this.snapshot.status === "authenticated";
    const value = this.replace("restoring");
    try {
      const result = await createApiClient(value.controller.signal)(
        "get",
        "/api/v1/me",
        {},
      );
      this.authenticate(value, result);
    } catch (error) {
      if (!this.current(value)) return;
      if (error instanceof ApiError && error.status === 401)
        this.replace(
          "anonymous",
          wasAuthenticated ? "会话已失效，请重新登录。" : undefined,
        );
      else this.publish({ ...this.snapshot, status: "unavailable", error });
    }
  };
  login = async (body: { email: string; password: string }) => {
    const value = this.replace("anonymous");
    // Login's 401 belongs to the form, not the expired-session handler.
    const api = createApiClient(value.controller.signal);
    const result = await api("post", "/api/v1/auth/login", { body });
    if (!this.current(value)) return;
    this.authenticate(value, result);
    this.announce();
  };
  logout = async () => {
    // Hide private UI and discard all cache before awaiting the network.
    const value = this.replace("signing-out");
    this.announce();
    try {
      await createApiClient(value.controller.signal)(
        "post",
        "/api/v1/auth/logout",
        {},
      );
      if (this.current(value)) this.replace("anonymous", "你已安全退出。");
    } catch (error) {
      if (!this.current(value)) return;
      if (error instanceof ApiError && error.status === 401)
        this.replace("anonymous", "会话已失效，请重新登录。");
      else this.publish({ ...this.snapshot, status: "logout-failed", error });
    } finally {
      this.announce();
    }
  };
  reconcile = () => {
    if (
      ["authenticated", "anonymous", "unavailable"].includes(
        this.snapshot.status,
      )
    )
      void this.restore();
  };
  suspend = () => {
    if (this.snapshot.status === "authenticated") this.replace("restoring");
  };
  dispose = () => {
    this.snapshot.runtime.controller.abort();
    void this.snapshot.runtime.queryClient.cancelQueries();
    this.snapshot.runtime.queryClient.clear();
  };
}
