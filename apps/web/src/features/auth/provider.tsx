"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionStore } from "./session";

const Context = createContext<SessionStore | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new SessionStore());
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => {
    void store.restore();
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("specbridge-session");
    // No user, credential or business data crosses tabs.
    store.setAnnounce(() => channel?.postMessage("changed"));
    if (channel)
      channel.onmessage = () => {
        store.sessionChanged();
      };
    const visibility = () => {
      if (document.visibilityState === "hidden") store.suspend();
      else if (store.getSnapshot().status === "restoring") void store.restore();
      else store.reconcile();
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) void store.restore();
    };
    window.addEventListener("focus", store.reconcile);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      channel?.close();
      store.setAnnounce(() => {});
      store.dispose();
      window.removeEventListener("focus", store.reconcile);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [store]);
  return (
    <Context.Provider value={store}>
      <QueryClientProvider client={snapshot.runtime.queryClient}>
        {children}
      </QueryClientProvider>
    </Context.Provider>
  );
}
export function useSession() {
  const store = useContext(Context);
  if (!store) throw new Error("AuthProvider is required");
  return {
    ...useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    ),
    store,
  };
}
