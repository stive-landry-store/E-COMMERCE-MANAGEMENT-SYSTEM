import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapApp } from "@capacitor/app";

/** Native shell polish when running inside Capacitor (Android / iOS). */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#07051a" });
    }
  } catch {
    /* plugin optional in browser */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });
}
