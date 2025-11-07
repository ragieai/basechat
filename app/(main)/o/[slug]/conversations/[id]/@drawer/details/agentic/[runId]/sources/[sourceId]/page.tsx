import SourceDetails from "./source-details";

interface DetailSourcePageProps {
  params: Promise<{ slug: string; id: string; runId: string; sourceId: string }>;
}

export default async function DetailsSourcePage({ params }: DetailSourcePageProps) {
  const { slug, id, runId, sourceId } = await params;

  return <SourceDetails slug={slug} sourceId={sourceId} runId={runId} />;
}
