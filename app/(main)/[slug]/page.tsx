import { authOrRedirect } from "@/lib/server/utils";

import Welcome from "./welcome";

export default async function Home({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const context = await authOrRedirect(p.slug);

  return <Welcome tenant={context.tenant} className="flex-1 flex flex-col w-full bg-white p-4 max-w-[717px]" />;
}
