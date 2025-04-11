import crypto from "crypto";
import "dotenv/config";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// run with: npm run decrypt-api-key encryptedKey
if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY environment variable is required");

if (process.argv.length < 3) {
  console.log("encryptedApiKey is required");
  process.exit(1);
}

const encryptedApiKey = process.argv[2];

function decryptApiKey(encryptedApiKey) {
  if (!encryptedApiKey) {
    console.error("Encrypted API key cannot be empty");
    process.exit(1);
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedApiKey.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      console.error("Invalid encrypted API key format");
      process.exit(1);
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
    console.error("Failed to decrypt API key:", error);
    process.exit(1);
  }
}

const decryptedKey = decryptApiKey(encryptedApiKey);
console.log("Decrypted API key:", decryptedKey);
process.exit(0);
