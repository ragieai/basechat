import { toNextJsHandler } from "better-auth/next-js";

import auth from "@/auth";

export const { POST, GET } = toNextJsHandler(auth);

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
