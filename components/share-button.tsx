import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ShareSettings } from "@/lib/api";
import ShareIcon from "@/public/icons/share.svg";

import ShareDialog from "./share-dialog";
import SharedDialog from "./shared-dialog";

interface ShareButtonProps {
  conversationId: string;
}

export function ShareButton({ conversationId }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async (settings: ShareSettings) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          tenant: window.location.pathname.split("/")[2], //TODO: we can get slug from actual tenant??
        },
        body: JSON.stringify({
          accessType: settings.accessType,
          recipientEmails: settings.accessType === "email" ? [settings.email!] : undefined,
          expiresAt: settings.expiresAt ? new Date(settings.expiresAt).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      const { shareId } = await response.json();
      setShareSettings({ ...settings, shareId });
      setIsShared(true);
    } catch (error) {
      toast.error("Failed to share conversation", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button>
          <Image src={ShareIcon} alt="Share conversation" />
        </button>
      </DialogTrigger>
      {isShared ? (
        <SharedDialog settings={shareSettings!} onClose={() => setIsShared(false)} />
      ) : (
        <ShareDialog conversationId={conversationId} onShare={handleShare} isLoading={isLoading} />
      )}
    </Dialog>
  );
}
