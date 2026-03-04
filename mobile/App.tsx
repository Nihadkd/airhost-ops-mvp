import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

const SERVNEST_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://nextjs-saas-v1.vercel.app";
const FALLBACK_HOME_PATH = "/dashboard";
const INACTIVITY_RESET_MS = 30 * 60 * 1000;

type WebMessage =
  | { type: "AUTH_READY" }
  | { type: "ROUTE"; path?: string }
  | { type: "PUSH_SYNC_OK" }
  | { type: "PUSH_SYNC_ERROR"; error?: string }
  | { type: "PUSH_SYNC_LOG"; message?: string }
  | { type: "UNREAD_COUNT"; count?: number };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function escapeForJs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export default function App() {
  const [openApp, setOpenApp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [initialPath, setInitialPath] = useState(FALLBACK_HOME_PATH);
  const [pushReady, setPushReady] = useState(false);
  const [tokenSynced, setTokenSynced] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );
  const [currentPath, setCurrentPath] = useState(FALLBACK_HOME_PATH);
  const [webError, setWebError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const webViewRef = useRef<WebView>(null);
  const expoPushTokenRef = useRef<string | null>(null);
  const routeStackRef = useRef<string[]>([FALLBACK_HOME_PATH]);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const skipNextForegroundResetRef = useRef(false);

  const webUrl = useMemo(
    () => `${SERVNEST_URL}${initialPath}${initialPath.includes("?") ? "&" : "?"}mobile=1&r=${reloadKey}`,
    [initialPath, reloadKey],
  );

  const injectedScript = useMemo(
    () => `
      (function () {
        if (window.__servnestHookInstalled) return;
        window.__servnestHookInstalled = true;
        function post(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }
        function routeChanged() {
          var path = window.location.pathname + window.location.search;
          post({ type: "ROUTE", path: path });
          var authReady =
            window.location.pathname.startsWith("/dashboard") ||
            window.location.pathname.startsWith("/orders") ||
            window.location.pathname.startsWith("/messages") ||
            window.location.pathname.startsWith("/profile") ||
            window.location.pathname.startsWith("/settings");
          if (authReady) {
            fetch("/api/notifications/unread-count", { cache: "no-store" })
              .then(function (res) {
                if (!res.ok) return { count: 0 };
                return res.json();
              })
              .then(function (payload) {
                var count = Number((payload && payload.count) || 0);
                post({ type: "UNREAD_COUNT", count: count > 0 ? count : 0 });
              })
              .catch(function () {
                post({ type: "UNREAD_COUNT", count: 0 });
              });
          }
          if (
            authReady
          ) {
            post({ type: "AUTH_READY" });
          }
        }
        var pushState = history.pushState;
        history.pushState = function () {
          pushState.apply(history, arguments);
          setTimeout(routeChanged, 0);
        };
        var replaceState = history.replaceState;
        history.replaceState = function () {
          replaceState.apply(history, arguments);
          setTimeout(routeChanged, 0);
        };
        window.addEventListener("popstate", routeChanged);
        setInterval(routeChanged, 10000);
        routeChanged();
      })();
      true;
    `,
    [],
  );

  const openPath = useCallback((path: string, forceReload = false) => {
    const nextPath = normalizePath(path);
    setCurrentPath(nextPath);
    setLoading(true);
    setWebError(null);
    setOpenApp(true);

    if (!openApp || forceReload || !webViewRef.current) {
      routeStackRef.current = [nextPath];
      setInitialPath(nextPath);
      setReloadKey((k) => k + 1);
      return;
    }

    const pathSafe = escapeForJs(nextPath);
    webViewRef.current.injectJavaScript(
      `
      (function () {
        var target = "${pathSafe}";
        if (window.location.pathname + window.location.search !== target) {
          window.location.assign(target);
        }
      })();
      true;
      `,
    );
  }, [openApp]);

  const goHome = useCallback((forceReload = false) => {
    setPushReady(false);
    setTokenSynced(false);
    routeStackRef.current = [FALLBACK_HOME_PATH];
    openPath(FALLBACK_HOME_PATH, forceReload);
  }, [openPath]);

  const openExternalTarget = useCallback((path: string, forceReload = false) => {
    skipNextForegroundResetRef.current = true;
    openPath(path, forceReload);
  }, [openPath]);

  const resolveAppPathFromUrl = useCallback((url: string) => {
    try {
      if (url.startsWith("servnest://")) {
        const withoutScheme = url.replace("servnest://", "");
        const slashIndex = withoutScheme.indexOf("/");
        const path = slashIndex >= 0 ? withoutScheme.slice(slashIndex) : "/";
        return normalizePath(path || "/");
      }
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const parsed = new URL(url);
        const webBase = new URL(SERVNEST_URL);
        if (parsed.host === webBase.host) {
          return `${parsed.pathname}${parsed.search}`;
        }
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const resolveNotificationTarget = useCallback((data: Record<string, unknown> | undefined) => {
    const explicitPath = String(data?.path ?? "");
    const targetUrlPath = String(data?.targetUrl ?? "");
    const orderId = String(data?.orderId ?? "");
    if (explicitPath.startsWith("/")) return explicitPath;
    if (targetUrlPath.startsWith("/")) return targetUrlPath;
    if (orderId) return `/orders/${orderId}`;
    return "/messages";
  }, []);

  const requestExpoPushToken = useCallback(async () => {
    if (expoPushTokenRef.current) return expoPushTokenRef.current;
    if (!Device.isDevice) return null;

    const permission = await Notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== "granted") {
      const ask = await Notifications.requestPermissionsAsync();
      status = ask.status;
    }
    setPermissionState(status);
    if (status !== "granted") return null;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return null;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    expoPushTokenRef.current = token;
    return token;
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (!Device.isDevice) return;
    const permission = await Notifications.getPermissionsAsync();
    setPermissionState(permission.status);
    if (permission.status === "granted") return;

    const asked = await Notifications.requestPermissionsAsync();
    setPermissionState(asked.status);
    if (asked.status !== "granted") {
      Alert.alert(
        "Allow notifications",
        "ServNest trenger varslingstillatelse for låseskjermvarsler og lyd ved nye meldinger.",
        [
          { text: "Ikke nå", style: "cancel" },
          { text: "Åpne innstillinger", onPress: () => void Linking.openSettings() },
        ],
      );
    }
  }, []);

  const syncPushTokenInWebContext = useCallback(
    async (token: string) => {
      const tokenSafe = escapeForJs(token);
      const platform = Device.osName?.toLowerCase().includes("ios") ? "ios" : "android";
      const platformSafe = escapeForJs(platform);
      const deviceNameSafe = escapeForJs(Device.deviceName ?? "mobile");

      const script = `
        (function () {
          function post(payload) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
            }
          }
          fetch("/api/users/me/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: "${tokenSafe}",
              platform: "${platformSafe}",
              deviceName: "${deviceNameSafe}"
            })
          })
            .then(function (res) {
              post({ type: "PUSH_SYNC_LOG", message: "push_token_response_" + res.status });
              if (res.ok) {
                post({ type: "PUSH_SYNC_OK" });
              } else {
                post({ type: "PUSH_SYNC_ERROR", error: "http_" + res.status });
              }
            })
            .catch(function (err) {
              post({ type: "PUSH_SYNC_ERROR", error: String((err && err.message) || err) });
            });
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0b8f7b",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkInitialLink = async () => {
      const firstUrl = await Linking.getInitialURL();
      if (!mounted || !firstUrl) return;
      const path = resolveAppPathFromUrl(firstUrl);
      if (!path) return;
      openExternalTarget(path, true);
    };

    void checkInitialLink();
    const sub = Linking.addEventListener("url", ({ url }) => {
      const path = resolveAppPathFromUrl(url);
      if (!path) return;
      openExternalTarget(path);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [openExternalTarget, resolveAppPathFromUrl]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded =
        appStateRef.current === "background" || appStateRef.current === "inactive";
      const nextIsBackgrounded = nextState === "background" || nextState === "inactive";

      if (appStateRef.current === "active" && nextIsBackgrounded) {
        backgroundedAtRef.current = Date.now();
      }

      appStateRef.current = nextState;

      if (nextState === "active") {
        setSyncAttempt((value) => value + 1);
        if (skipNextForegroundResetRef.current) {
          skipNextForegroundResetRef.current = false;
          backgroundedAtRef.current = null;
          return;
        }

        if (wasBackgrounded) {
          const backgroundedAt = backgroundedAtRef.current;
          backgroundedAtRef.current = null;
          if (backgroundedAt && Date.now() - backgroundedAt >= INACTIVITY_RESET_MS) {
            goHome(true);
          }
        }
      }
    });
    return () => sub.remove();
  }, [goHome]);

  useEffect(() => {
    const onBackPress = () => {
      if (!openApp) return false;

      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      const stack = routeStackRef.current;
      if (stack.length > 1) {
        openPath(stack[stack.length - 2]);
        return true;
      }

      if (!currentPath.startsWith(FALLBACK_HOME_PATH)) {
        goHome();
        return true;
      }

      setOpenApp(false);
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [canGoBack, currentPath, goHome, openApp, openPath]);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const target = resolveNotificationTarget(data);
      console.info("[mobile-push] initial_tap", { target });
      openExternalTarget(target, true);
    });

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.info("[mobile-push] received", {
        orderId: data?.orderId ?? null,
        path: data?.path ?? null,
      });
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const orderId = String(data?.orderId ?? "");
      const target = resolveNotificationTarget(data as Record<string, unknown> | undefined);
      console.info("[mobile-push] tapped", { target, orderId: orderId || null });
      openExternalTarget(target, true);
    });
    return () => {
      received.remove();
      sub.remove();
    };
  }, [openExternalTarget, resolveNotificationTarget]);

  useEffect(() => {
    if (!openApp || !pushReady || tokenSynced) return;
    let cancelled = false;

    const run = async () => {
      const token = await requestExpoPushToken();
      if (!token || cancelled) return;
      await syncPushTokenInWebContext(token);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [openApp, pushReady, tokenSynced, syncAttempt, requestExpoPushToken, syncPushTokenInWebContext]);

  const onWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as WebMessage;
      if (data.type === "AUTH_READY") {
        setPushReady(true);
        setSyncError(null);
        setSyncAttempt((value) => value + 1);
        return;
      }

      if (data.type === "ROUTE" && data.path) {
        const nextPath = normalizePath(data.path);
        setCurrentPath(nextPath);
        setLoading(false);
        setWebError(null);

        if (routeStackRef.current[routeStackRef.current.length - 1] !== nextPath) {
          routeStackRef.current = [...routeStackRef.current.slice(-24), nextPath];
        }

        if (nextPath.startsWith("/login")) {
          setPushReady(false);
          setTokenSynced(false);
          setSyncError(null);
          setUnreadCount(0);
        }
        return;
      }

      if (data.type === "PUSH_SYNC_OK") {
        setTokenSynced(true);
        setSyncError(null);
        console.info("[mobile-push] token_synced");
        return;
      }

      if (data.type === "PUSH_SYNC_ERROR") {
        const error = data.error ?? "unknown";
        setSyncError(error);
        console.warn("push_sync_error", error);
        setTimeout(() => setSyncAttempt((value) => value + 1), 2000);
        return;
      }

      if (data.type === "PUSH_SYNC_LOG") {
        console.info("[mobile-push] web_log", data.message ?? "");
        return;
      }

      if (data.type === "UNREAD_COUNT") {
        const count = Number(data.count ?? 0);
        setUnreadCount(Number.isFinite(count) && count > 0 ? count : 0);
      }
    } catch {
      // Ignore unexpected message payloads from the embedded web app.
    }
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const url = request.url;
    if (
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("sms:") ||
      url.startsWith("geo:")
    ) {
      void Linking.openURL(url);
      return false;
    }
    return true;
  }, []);

  if (openApp) {
    return (
      <SafeAreaView style={styles.webRoot}>
        <StatusBar style="dark" />
        <View style={styles.webTopBar}>
          <Pressable
            onPress={() => {
              if (canGoBack) {
                webViewRef.current?.goBack();
                return;
              }
              if (!currentPath.startsWith(FALLBACK_HOME_PATH)) {
                goHome();
                return;
              }
              setOpenApp(false);
            }}
            style={styles.topButton}
          >
            <Text style={styles.topButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.webTitle}>ServNest</Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              setLoading(true);
              setWebError(null);
              setReloadKey((k) => k + 1);
            }}
            style={styles.topButton}
          >
            <Text style={styles.topButtonText}>Reload</Text>
          </Pressable>
        </View>
        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            key={reloadKey}
            source={{ uri: webUrl }}
            onLoadEnd={() => setLoading(false)}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
            onMessage={onWebMessage}
            onError={(event) => {
              const reason = event.nativeEvent.description || "Could not load page.";
              setWebError(reason);
              setLoading(false);
            }}
            onHttpError={(event) => {
              const status = event.nativeEvent.statusCode;
              setWebError(`Server returned ${status}.`);
              setLoading(false);
            }}
            injectedJavaScript={injectedScript}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            incognito={false}
            originWhitelist={["https://*"]}
            setSupportMultipleWindows={false}
          />
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0b8f7b" />
              <Text style={styles.loadingText}>Opening ServNest...</Text>
            </View>
          ) : null}
          {webError ? (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorTitle}>Could not load app</Text>
              <Text style={styles.errorText}>{webError}</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  setWebError(null);
                  setLoading(true);
                  setReloadKey((k) => k + 1);
                }}
              >
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
              <Pressable onPress={() => void Linking.openURL(`${SERVNEST_URL}${currentPath}`)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Open in browser</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoWrap}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>H</Text>
        </View>
        <Text style={styles.logoText}>
          <Text style={styles.logoAccent}>Se</Text>rv<Text style={styles.logoAccent}>N</Text>est
        </Text>
      </View>

      <Text style={styles.subtitle}>Open jobs and messages from mobile</Text>

      <Pressable
        onPress={() => {
          void ensureNotificationPermission();
          goHome(true);
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Open ServNest</Text>
      </Pressable>

      <Pressable onPress={() => void Linking.openURL(`${SERVNEST_URL}/login`)} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Open in browser</Text>
      </Pressable>

      <Pressable onPress={() => void ensureNotificationPermission()} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Enable notifications</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert(
            "Push setup",
            tokenSynced
              ? "Push token is synced for this signed-in user."
              : `Push token is not synced yet.${syncError ? ` Last error: ${syncError}` : " Sign in first, then open dashboard/messages to sync automatically."}\nPermission: ${permissionState}`,
          )
        }
        style={styles.infoButton}
      >
        <Text style={styles.infoButtonText}>Push status</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f6f8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  logoIcon: {
    height: 72,
    width: 72,
    borderRadius: 18,
    backgroundColor: "#0b8f7b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIconText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "700",
  },
  logoText: {
    fontSize: 38,
    color: "#12303d",
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  logoAccent: {
    color: "#0b8f7b",
  },
  subtitle: {
    color: "#46616f",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 12,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    backgroundColor: "#0b8f7b",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#c6d4dc",
    backgroundColor: "#fff",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#12303d",
    fontWeight: "600",
    fontSize: 15,
  },
  infoButton: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoButtonText: {
    color: "#0b8f7b",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  webRoot: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webTopBar: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#dce8ee",
    backgroundColor: "#f7fbfc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  topButton: {
    borderRadius: 10,
    backgroundColor: "#e8f0f4",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topButtonText: {
    color: "#12303d",
    fontWeight: "600",
    fontSize: 13,
  },
  webTitle: {
    fontWeight: "800",
    color: "#0b8f7b",
    letterSpacing: 0.6,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    backgroundColor: "#0b8f7b",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  webContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#365763",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.94)",
    justifyContent: "center",
    padding: 20,
  },
  errorTitle: {
    color: "#12303d",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  errorText: {
    color: "#456572",
    fontSize: 14,
    marginBottom: 16,
  },
});

