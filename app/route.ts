import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { getStartPath } from "@/lib/paths";

export function GET() {
  return redirect(getStartPath());
}
