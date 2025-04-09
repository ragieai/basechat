import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ShareIcon from "@/public/icons/share.svg";

import ShareDialog from "./share-dialog";
import SharedDialog from "./shared-dialog";

interface ShareButtonProps {
  conversationId: string;
  slug: string;
}

export function ShareButton({ conversationId, slug }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const handleShare = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/shares`, {
        method: "POST",
        body: JSON.stringify({
          slug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      const { shareIdResponse } = await response.json();
      setShareId(shareIdResponse);
      setIsShared(true);
    } catch (error) {
      toast.error("Failed to share conversation");
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
        <SharedDialog
          shareId={shareId}
          conversationId={conversationId}
          slug={slug}
          onClose={() => setIsShared(false)}
        />
      ) : (
        <ShareDialog conversationId={conversationId} onShare={handleShare} isLoading={isLoading} slug={slug} />
      )}
    </Dialog>
  );
}
