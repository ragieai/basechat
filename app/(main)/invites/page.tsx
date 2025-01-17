import { requireSession } from "@/lib/server-utils";

interface Props {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function StartPage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;
  return null;
}
