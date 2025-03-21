/**
 * Validate the HMAC SHA-256 signature of the payload.
 * This version is compatible with the Edge runtime.
 *
 * @param secretKey - The shared secret key used for HMAC generation.
 * @param payloadBody - The raw request body as a Buffer.
 * @param receivedSignature - The signature received in the 'X-Signature' header.
 * @returns True if the signature is valid, False otherwise.
 */
export async function validateSignature(
  secretKey: string,
  payloadBody: ArrayBuffer,
  receivedSignature: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/validate-signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secretKey,
        payloadBody: Array.from(new Uint8Array(payloadBody)),
        receivedSignature,
      }),
    });

    const { isValid } = await response.json();
    return isValid;
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
}
