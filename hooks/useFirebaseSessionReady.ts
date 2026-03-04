import { useEffect, useState } from "react";
import { subscribeAuthState } from "@/lib/firebase";

export type FirebaseSessionState = {
  /** True once Firebase has emitted its first auth state */
  ready: boolean;
  /** True only when a Firebase user is signed in (required for Convex auth) */
  hasUser: boolean;
};

type SessionListener = (state: FirebaseSessionState) => void;

const INITIAL_SHARED_STATE: FirebaseSessionState = {
  ready: false,
  hasUser: false,
};

let sharedState: FirebaseSessionState = {
  ...INITIAL_SHARED_STATE,
};
let subscriptionStarted = false;
let unsubscribeSharedAuthState: (() => void) | null = null;
const listeners = new Set<SessionListener>();

function notifyListeners(nextState: FirebaseSessionState) {
  for (const listener of listeners) {
    listener(nextState);
  }
}

function ensureSharedAuthSubscription() {
  if (subscriptionStarted) return;
  subscriptionStarted = true;

  unsubscribeSharedAuthState = subscribeAuthState((user) => {
    sharedState = {
      ready: true,
      hasUser: user !== null,
    };
    notifyListeners(sharedState);
  });
}

export function cleanupSharedAuthSubscription() {
  if (unsubscribeSharedAuthState) {
    unsubscribeSharedAuthState();
  }
  unsubscribeSharedAuthState = null;
  subscriptionStarted = false;
  sharedState = { ...INITIAL_SHARED_STATE };
  listeners.clear();
}

if (__DEV__) {
  const hot = (globalThis as { module?: { hot?: { dispose: (cb: () => void) => void } } })
    .module?.hot;
  hot?.dispose(() => {
    cleanupSharedAuthSubscription();
  });
}

export function useFirebaseSessionReady(): FirebaseSessionState {
  const [state, setState] = useState<FirebaseSessionState>(sharedState);

  useEffect(() => {
    ensureSharedAuthSubscription();

    const listener: SessionListener = (nextState) => {
      setState(nextState);
    };

    listeners.add(listener);
    listener(sharedState);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
