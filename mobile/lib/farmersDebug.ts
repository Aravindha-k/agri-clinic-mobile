export function farmersDebug(message: string, data?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (data) {
    console.log(`[Farmers] ${message}`, data);
  } else {
    console.log(`[Farmers] ${message}`);
  }
}
