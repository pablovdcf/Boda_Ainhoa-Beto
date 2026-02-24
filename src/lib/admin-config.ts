const DEFAULT_ADMIN_PIN = "011222";

export const ADMIN_CONFIG = {
  ADMIN_PIN: import.meta.env.PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PIN
} as const;
