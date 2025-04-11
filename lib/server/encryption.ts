import "server-only";
import assert from "assert";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // Must be 32 bytes (256 bits)
const ENCRYPTION_IV_LENGTH = 16; // 16 bytes for AES

assert(!!ENCRYPTION_KEY, "ENCRYPTION_KEY environment variable is required");
assert(Buffer.from(ENCRYPTION_KEY, "hex").length === 32, "ENCRYPTION_KEY must be 32 bytes (64 hex characters)");

export type CipherText = string;

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

export function encrypt(plainText: string): CipherText {
  if (!plainText) {
    throw new EncryptionError("Plain text cannot be empty");
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);

    // Encrypt the API key
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString("hex");

    // Return iv:authTag:encryptedData format
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    throw new EncryptionError(
      `Failed to encrypt plain text: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function decrypt(cipherText: CipherText): string {
  if (!cipherText) {
    throw new EncryptionError("Cipher text cannot be empty");
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new EncryptionError("Invalid cipher text format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new EncryptionError(
      `Failed to decrypt cipher text: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Helper function to generate a new encryption key
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Example usage:
// const key = generateEncryptionKey();
// console.log('Use this as your ENCRYPTION_KEY:', key);
