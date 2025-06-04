import { BILLING_ENABLED, SLACK_CLIENT_ID } from "@/lib/server/settings";
import { adminOrRedirect } from "@/lib/server/utils";

import SettingsNav from "../settings-nav";

import SlackSettings from "./slack-settings";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SlackSettingsPage({ params }: Props) {
  const p = await params;
  const { tenant } = await adminOrRedirect(p.slug);

  const slackConfigured = Boolean(SLACK_CLIENT_ID);

  return (
    <div className="flex justify-center overflow-auto w-full">
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav tenant={tenant} billingEnabled={BILLING_ENABLED} />
        <SlackSettings tenant={tenant} slackConfigured={slackConfigured} />
      </div>
    </div>
  );
}
