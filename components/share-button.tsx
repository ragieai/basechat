import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PlusIcon from "@/public/icons/plus.svg";

interface ShareButtonProps {
  conversationId: string;
  className?: string;
}

export function ShareButton({ conversationId, className }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    try {
      // TODO: Implement actual sharing logic here
      // For now, we'll just generate a dummy share URL
      setIsShared(true);
    } catch (error) {
      toast.error("Failed to share conversation", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
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
        <SharedDialog conversationId={conversationId} onClose={() => setIsShared(false)} />
      ) : (
        <ShareDialog onShare={handleShare} />
      )}
    </Dialog>
  );
}

function ShareDialog({ onShare }: { onShare: () => void }) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share Conversation</DialogTitle>
        <DialogDescription>Create a shareable link to this conversation.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">Anyone with the link will be able to view this conversation.</p>
      </div>
      <DialogFooter>
        <Button onClick={onShare}>Create Share Link</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SharedDialog({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const shareUrl = new URL(`/share/${conversationId}`, window.location.href).toString();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share Link Created</DialogTitle>
        <DialogDescription>Share this link to let others view the conversation.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="shareUrl">Share URL</Label>
        <Input id="shareUrl" type="text" value={shareUrl} readOnly />
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Back
        </Button>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Copied share URL");
          }}
        >
          Copy Link
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
