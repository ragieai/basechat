import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Header from "@/app/(main)/public-header";
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

  {
    /*return <>{children}</>;*/
  }
  return (
    <div className="h-full w-full flex flex-col items-center bg-white">
      <Header />
      <div className="h-full w-full flex-1 flex justify-center overflow-auto">
        <div className="h-full w-full flex flex-col items-center justify-center min-w-[500px]">{children}</div>
      </div>
      {/*profile.role != "user" && (
        <Footer className="h-[80px] shrink-0 w-full bg-[#27272A] flex items-center justify-center" />
      )*/}
    </div>
  );
}
