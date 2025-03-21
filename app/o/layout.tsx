import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Check if user is authenticated
  const session = await auth();

  // If user is authenticated, clear their auth cookies
  if (session) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie: { name: string }) => {
      if (cookie.name.startsWith("next-auth.")) {
        cookieStore.delete(cookie.name);
      }
    });

    // Get the current URL path
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/";

    // Redirect back to the original path to refresh the page and clear the session
    redirect(pathname);
  }

  return <>{children}</>;
}
