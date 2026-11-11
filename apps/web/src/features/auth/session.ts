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
function runtime(
  epoch: number,
  unauthorized: () => void,
  available: () => boolean,
) {
  const controller = new AbortController();
  let requests = new AbortController();
  controller.signal.addEventListener("abort", () => requests.abort(), {
    once: true,
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  const api: ReturnType<typeof createApiClient> = (method, route, options) => {
    if (!available())
      return Promise.reject(new ApiError(503, "SESSION_UNAVAILABLE"));
    return createApiClient(requests.signal, unauthorized)(
      method,
      route,
      options,
    );
  };
  return {
    epoch,
    controller,
    queryClient,
    api,
    pause: () => {
      requests.abort();
      requests = new AbortController();
      void queryClient.cancelQueries();
    },
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
  private identityCheck?: AbortController;
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
    return runtime(
      epoch,
      () => {
        if (this.snapshot.runtime.epoch === epoch) {
          this.replace("anonymous", "会话已失效，请重新登录。");
        }
      },
      () =>
        this.snapshot.runtime.epoch === epoch &&
        this.snapshot.status === "authenticated",
    );
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
    this.identityCheck?.abort();
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
    // Only a known identity has private state to preserve. Initial/anonymous
    // restoration and Strict Mode's setup-after-dispose need a fresh runtime.
    if (!this.snapshot.user || this.snapshot.runtime.controller.signal.aborted)
      this.replace("restoring");
    this.identityCheck?.abort();
    const check = new AbortController();
    this.identityCheck = check;
    const { runtime: value, user } = this.snapshot;
    // A recheck is not an identity change. Keep this user's isolated forms and
    // cache, but cancel old traffic and disallow private requests until verified.
    this.publish({ ...this.snapshot, status: "restoring", error: undefined });
    value.pause();
    const current = () => this.current(value) && !check.signal.aborted;
    try {
      // replace/dispose/suspend already cancel this check explicitly. A single
      // lifetime avoids aborting the same identity fetch through two roots.
      const result = await createApiClient(check.signal)(
        "get",
        "/api/v1/me",
        {},
      );
      if (!current()) return;
      if (user && user.id !== result.data.user.id) {
        this.authenticate(this.replace("restoring"), result);
      } else {
        // Revalidate resource permissions when the preserved tree resumes.
        await value.queryClient.invalidateQueries({ refetchType: "none" });
        if (current()) this.authenticate(value, result);
      }
    } catch (error) {
      if (!current()) return;
      if (error instanceof ApiError && error.status === 401)
        this.replace(
          "anonymous",
          user ? "会话已失效，请重新登录。" : undefined,
        );
      else this.publish({ ...this.snapshot, status: "unavailable", error });
    } finally {
      if (this.identityCheck === check) this.identityCheck = undefined;
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
    if (this.snapshot.user) {
      this.identityCheck?.abort();
      this.publish({ ...this.snapshot, status: "restoring", error: undefined });
      this.snapshot.runtime.pause();
    }
  };
  sessionChanged = () => {
    // An explicit login/logout notification is a real session boundary, even
    // when the next login happens to use the same account.
    this.replace("restoring");
    void this.restore();
  };
  dispose = () => {
    this.identityCheck?.abort();
    this.snapshot.runtime.controller.abort();
    void this.snapshot.runtime.queryClient.cancelQueries();
    this.snapshot.runtime.queryClient.clear();
  };
}
