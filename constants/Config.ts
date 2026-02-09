export const Config = {
  // App
  APP_NAME: "LockDigit",
  APP_VERSION: "1.0.0",

  // PIN
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 6,

  // Session
  SESSION_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes of inactivity

  // Document types
  DOCUMENT_TYPES: [
    { id: "drivers_license", label: "Driver's License", icon: "car" },
    { id: "passport", label: "Passport", icon: "globe" },
    { id: "vaccination", label: "Vaccination Certificate", icon: "heart-pulse" },
    { id: "national_id", label: "National ID", icon: "id-card" },
    { id: "insurance", label: "Insurance", icon: "shield-check" },
    { id: "other", label: "Other", icon: "file-text" },
  ] as const,

  // Bill categories
  BILL_CATEGORIES: [
    "electricity",
    "water",
    "internet",
    "phone",
    "rent",
    "insurance",
    "loan",
    "subscription",
    "other",
  ] as const,
} as const;

export default Config;
