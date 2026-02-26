import { useEffect, useState } from "react";
import { subscribeAuthState } from "@/lib/firebase";

export function useFirebaseSessionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setReady(true);
    });
    return unsubscribe;
  }, []);

  return ready;
}
