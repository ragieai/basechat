import { authOrRedirect } from "@/lib/server/utils";

import Welcome from "./welcome";

export default async function Home({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const context = await authOrRedirect(p.slug);

  return (
    <div style={{ background: "var(--bg-app)" }} className="min-h-[calc(100vh-64px)] w-full">
      <div className="w-full max-w-[717px] px-4 mx-auto h-full flex flex-col items-start justify-start py-10">
        <Welcome tenant={context.tenant} profile={context.profile} className="flex-1 flex flex-col w-full" />
      </div>
    </div>
  );
}
