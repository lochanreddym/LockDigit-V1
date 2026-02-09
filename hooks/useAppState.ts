import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "./useAuth";
import { Config } from "@/constants/Config";

/**
 * Hook that monitors app state changes and locks the app
 * when it comes back from background after the timeout period.
 */
export function useAppStateLock() {
  const backgroundTimestamp = useRef<number | null>(null);
  const { setPinVerified, isAuthenticated, hasPin } = useAuthStore();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          backgroundTimestamp.current = Date.now();
        }

        if (nextAppState === "active" && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (
            elapsed > Config.SESSION_TIMEOUT_MS &&
            isAuthenticated &&
            hasPin
          ) {
            // Lock the app - require PIN re-entry
            setPinVerified(false);
          }
          backgroundTimestamp.current = null;
        }
      }
    );

    return () => subscription.remove();
  }, [isAuthenticated, hasPin, setPinVerified]);
}
