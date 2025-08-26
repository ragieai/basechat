import { authOrRedirect } from "@/lib/server/utils";

import Welcome from "./welcome";

export default async function Home({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const context = await authOrRedirect(p.slug);

  return (
    <div className="ll-hero-page">
      <div className="ll-hero-container">
        <div className="ll-hero-stack">
          <Welcome tenant={context.tenant} profile={context.profile} className="flex-1 flex flex-col w-full" />
        </div>
      </div>
    </div>
  );
}
