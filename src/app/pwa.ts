export async function registerPwa(): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    // Do not expose error details/URLs or block the online application.
    console.warn("Offline support is unavailable. You can continue using TRUGEN FOODS online.");
  }
}
