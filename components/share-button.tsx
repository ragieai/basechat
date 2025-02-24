import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ShareButtonProps, ShareSettings } from "@/lib/api";
import PlusIcon from "@/public/icons/plus.svg";

import ShareDialog from "./share-dialog";
import SharedDialog from "./shared-dialog";
export function ShareButton({ conversationId, className }: ShareButtonProps) {
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
        <Button variant="ghost" size="icon" className={className}>
          <Image src={PlusIcon} alt="Share conversation" width={20} height={20} />
        </Button>
      </DialogTrigger>
      {isShared ? (
        <SharedDialog settings={shareSettings!} onClose={() => setIsShared(false)} />
      ) : (
        <ShareDialog conversationId={conversationId} onShare={handleShare} isLoading={isLoading} />
      )}
    </Dialog>
  );
}
