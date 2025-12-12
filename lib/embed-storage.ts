/**
 * LocalStorage utilities for embedded chat widget
 * Manages JWT tokens and conversation IDs for anonymous users
 */

const STORAGE_PREFIX = "ragie-embed";

/**
 * Generate a storage key for a specific tenant and key
 */
function getStorageKey(tenantSlug: string, key: string): string {
  return `${STORAGE_PREFIX}-${tenantSlug}-${key}`;
}

/**
 * Store JWT token for a tenant
 */
export function storeJwtToken(tenantSlug: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(tenantSlug, "jwt"), token);
  } catch (error) {
    console.error("Failed to store JWT token:", error);
  }
}

/**
 * Retrieve JWT token for a tenant
 */
export function getJwtToken(tenantSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(getStorageKey(tenantSlug, "jwt"));
  } catch (error) {
    console.error("Failed to retrieve JWT token:", error);
    return null;
  }
}

/**
 * Remove JWT token for a tenant
 */
export function removeJwtToken(tenantSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(tenantSlug, "jwt"));
  } catch (error) {
    console.error("Failed to remove JWT token:", error);
  }
}

/**
 * Store conversation IDs for a tenant (for quick access on return visits)
 */
export function storeConversationIds(tenantSlug: string, conversationIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(tenantSlug, "conversations"), JSON.stringify(conversationIds));
  } catch (error) {
    console.error("Failed to store conversation IDs:", error);
  }
}

/**
 * Retrieve conversation IDs for a tenant
 */
export function getConversationIds(tenantSlug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getStorageKey(tenantSlug, "conversations"));
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to retrieve conversation IDs:", error);
    return [];
  }
}

/**
 * Add a conversation ID to the stored list
 */
export function addConversationId(tenantSlug: string, conversationId: string): void {
  const existing = getConversationIds(tenantSlug);
  if (!existing.includes(conversationId)) {
    // Keep most recent conversations first, limit to 50
    const updated = [conversationId, ...existing].slice(0, 50);
    storeConversationIds(tenantSlug, updated);
  }
}

/**
 * Store the current/active conversation ID
 */
export function storeCurrentConversationId(tenantSlug: string, conversationId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (conversationId) {
      localStorage.setItem(getStorageKey(tenantSlug, "current-conversation"), conversationId);
    } else {
      localStorage.removeItem(getStorageKey(tenantSlug, "current-conversation"));
    }
  } catch (error) {
    console.error("Failed to store current conversation ID:", error);
  }
}

/**
 * Get the current/active conversation ID
 */
export function getCurrentConversationId(tenantSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(getStorageKey(tenantSlug, "current-conversation"));
  } catch (error) {
    console.error("Failed to retrieve current conversation ID:", error);
    return null;
  }
}

/**
 * Clear all stored data for a tenant
 */
export function clearTenantData(tenantSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    removeJwtToken(tenantSlug);
    localStorage.removeItem(getStorageKey(tenantSlug, "conversations"));
    localStorage.removeItem(getStorageKey(tenantSlug, "current-conversation"));
  } catch (error) {
    console.error("Failed to clear tenant data:", error);
  }
}

/**
 * Check if the user has any stored session data for a tenant
 */
export function hasStoredSession(tenantSlug: string): boolean {
  return getJwtToken(tenantSlug) !== null;
}
