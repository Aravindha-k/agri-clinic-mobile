/**
 * Classified startup failures — never conflate module load with network errors.
 */
export type StartupErrorCategory =
  | "network_unreachable"
  | "configuration_error"
  | "auth_bootstrap_error"
  | "storage_error"
  | "providers_import_error"
  | "unknown_startup_error";

export type StartupErrorCopy = {
  category: StartupErrorCategory;
  title: string;
  message: string;
  messageTa: string;
};

const COPY: Record<StartupErrorCategory, Omit<StartupErrorCopy, "category">> = {
  network_unreachable: {
    title: "Unable to finish startup",
    message: "The app could not reach the server. Check the connection and try again.",
    messageTa: "சேவையகத்தை அணுக முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்."
  },
  configuration_error: {
    title: "The app could not start",
    message: "App configuration error. Reinstall the latest APK from your administrator.",
    messageTa: "செயலி கட்டமைப்பு பிழை. நிர்வாகியிடமிருந்து சமீபத்திய APK ஐ மீண்டும் நிறுவவும்."
  },
  auth_bootstrap_error: {
    title: "Unable to finish startup",
    message:
      "Local session restore took too long. Your offline data on this device is still safe. Retry to continue.",
    messageTa:
      "உள்ளூர் அமர்வு மீட்டெடுப்பு அதிக நேரம் எடுத்தது. சாதனத்தில் உள்ள ஆஃப்லைன் தரவு பாதுகாப்பாக உள்ளது. தொடர மீண்டும் முயற்சிக்கவும்."
  },
  storage_error: {
    title: "Unable to finish startup",
    message: "Secure storage could not be read. Retry, or reinstall if this keeps happening.",
    messageTa: "பாதுகாப்பான சேமிப்பகத்தைப் படிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
  },
  providers_import_error: {
    title: "Unable to finish startup",
    message: "Startup services failed to load. Retry to try again. This is not a network problem.",
    messageTa:
      "தொடக்க சேவைகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும். இது பிணையச் சிக்கல் அல்ல."
  },
  unknown_startup_error: {
    title: "Unable to finish startup",
    message: "Startup could not complete. Retry to try again. Your offline data on this device is still safe.",
    messageTa:
      "தொடக்கத்தை முடிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும். சாதனத்தில் உள்ள ஆஃப்லைன் தரவு பாதுகாப்பாக உள்ளது."
  }
};

export function getStartupErrorCopy(category: StartupErrorCategory): StartupErrorCopy {
  return { category, ...COPY[category] };
}

/** Infer category from a thrown message — never default to network. */
export function classifyStartupError(message: string): StartupErrorCategory {
  const lower = message.toLowerCase();
  if (
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    (lower.includes("timeout") && lower.includes("api")) ||
    lower.includes("econnrefused") ||
    lower.includes("unreachable")
  ) {
    return "network_unreachable";
  }
  if (lower.includes("config") || lower.includes("api_base") || lower.includes("missing api")) {
    return "configuration_error";
  }
  if (lower.includes("securestore") || lower.includes("storage") || lower.includes("asyncstorage")) {
    return "storage_error";
  }
  if (lower.includes("auth") || lower.includes("session") || lower.includes("token")) {
    return "auth_bootstrap_error";
  }
  if (lower.includes("import") || lower.includes("providers") || lower.includes("bundle")) {
    return "providers_import_error";
  }
  return "unknown_startup_error";
}
