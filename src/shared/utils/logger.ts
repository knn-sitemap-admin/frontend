/**
 * Frontend Centralized Logger
 * 
 * Provides a unified way to handle logs throughout the frontend application.
 * Logs are prefixed with [INFO], [WARN], etc., and can be configured to 
 * exhibit different behaviors based on the environment.
 */

const isDev = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_IS_DEV === "true";

export const Logger = {
  /**
   * General debugging logs. Only visible in development.
   */
  log: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  },

  /**
   * Information logs. Only visible in development.
   */
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning logs. Visible in both development and production.
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error logs. Visible in both development and production.
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
