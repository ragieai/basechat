"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface Props {
  tenantId: string;
}

// This component exists because there is no API to update
// the user's session on the server. We use this component
// to set the active tenant ID for the user.
export default function RedirectComponent({ tenantId }: Props) {
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await update({ tenantId });
      router.push("/");
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
