import crypto from "crypto";

// Generate a random 32-byte key and convert to hex
const encryptionKey = crypto.randomBytes(32).toString("hex");
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
process.exit(0);
