import Link from "next/link";

import { Title } from "../common";

import ChangePassword from "./change-password";

export default function ChangePasswordPage({ token }: { token: string }) {
  return (
    <>
      <Title>
        Enter new password for <br />
        <span className="text-[#D946EF]">bob@test.com</span>
      </Title>

      <ChangePassword />
    </>
  );
}
