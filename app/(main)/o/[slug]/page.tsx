import { authOrRedirect } from "@/lib/server/utils";

import Welcome from "./welcome";

export default async function Home({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const context = await authOrRedirect(p.slug);

  return (
    <div style={{ background: "var(--bg-app)" }} className="flex-1 flex flex-col w-full">
      <div className="w-full max-w-[717px] px-4 mx-auto h-full">
        <Welcome tenant={context.tenant} profile={context.profile} className="flex-1 flex flex-col w-full" />
      </div>
    </div>
  );
}
