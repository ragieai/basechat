import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts up to two initials from a given title.
 * @param name - The title to extract initials from.
 * @returns A string containing up to two initials.
 */
export function getInitials(name: string): string {
  // Split the title into words and filter out empty strings
  const words = name.split(/\s+/).filter((word) => word.trim().length > 0);

  // Get the first character of up to two words
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials;
}

// Generate a slug from a given input (tenant name)
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace one or more spaces with a single dash
    .replace(/[^a-z0-9-]/g, "") // Remove any characters that aren't lowercase letters, numbers, or dashes
    .replace(/-+/g, "-") // Replace multiple consecutive dashes with a single dash
    .replace(/^-|-$/g, "") // Remove leading and trailing dashes
    .slice(0, 30); // Limit to 30 characters
}
