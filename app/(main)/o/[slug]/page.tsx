import { authOrRedirect } from "@/lib/server/utils";

import Welcome from "./welcome";

export default async function Home({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const context = await authOrRedirect(p.slug);

  return (
    <div style={{ background: "var(--bg-app)" }} className="flex-1 flex flex-col w-full p-4 max-w-[717px]">
      <Welcome tenant={context.tenant} profile={context.profile} className="flex-1 flex flex-col w-full" />
    </div>
  );
}
