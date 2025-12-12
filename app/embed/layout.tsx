import { ReactNode } from "react";

interface Props {
  params: Promise<{ slug: string }>;
  children?: ReactNode;
}

export default async function EmbedLayout({ children, params }: Props) {
  return <div className="h-screen w-full flex flex-col bg-white overflow-hidden">{children}</div>;
}

/**
 * Generate metadata for embed pages
 * Note: X-Frame-Options and CSP headers are handled in next.config.ts
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: `Chat - ${slug}`,
    // Prevent search engine indexing of embed pages
    robots: "noindex, nofollow",
  };
}
