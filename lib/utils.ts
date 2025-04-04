import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { BASE_URL } from "./server/settings";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts up to two initials from a given title.
 * @param name - The title to extract initials from.
 * @returns A string containing up to two initials.
 */
export function getInitials(name: string, initialCount: number = 2): string {
  // Split the title into words and filter out empty strings
  const words = name.split(/\s+/).filter((word) => word.trim().length > 0);

  // Get the first character of up to initialCount words
  const initials = words
    .slice(0, initialCount)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials;
}

/**
 * Deterministically maps a tenantId to a number between 1 and max
 * @param tenantId - The tenant ID to map
 * @param max - The maximum number in the range (inclusive) (the number of avatar classes in globals.css)
 * @returns A number between 1 and max
 */
export function getAvatarNumber(tenantId: string, max: number = 3): number {
  // Convert tenantId to a number using a simple hash function
  if (!tenantId) return 1;
  const hash = tenantId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the hash to get a number between 1 and max
  return Math.abs(hash % max) + 1;
}

export function getSignInUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const redirectToParam = url.searchParams.get("redirectTo");

  const signInUrl = new URL("/sign-in", BASE_URL);
  if (redirectToParam) {
    signInUrl.searchParams.set("redirectTo", redirectToParam);
  }
  return signInUrl;
}
