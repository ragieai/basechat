import Link from "next/link";
import { z } from "zod";

import { Title } from "../common";

import ChangePassword from "./change-password";

interface Props {
  searchParams: Promise<{ token: string }>;
}

const payloadSchema = z.object({
  sub: z.string(),
});

export default async function ChangePasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const unverified = atob(params.token.split(".")[1]);
  const payload = payloadSchema.parse(JSON.parse(unverified));

  return (
    <>
      <Title>
        Enter new password for <br />
        <span className="text-[#D946EF]">{payload.sub}</span>
      </Title>
      <ChangePassword token={params.token} />
      <Link href="/reset" className="mt-6 text-[16px] text-[#74747A] hover:underline">
        Back to reset
      </Link>
    </>
  );
}
