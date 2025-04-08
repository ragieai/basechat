import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareSettings } from "@/lib/api";

export default function SharedDialog({
  settings,
  onClose,
}: {
  settings: ShareSettings & {
    shareId?: string;
    conversationId: string;
  };
  onClose: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shareUrl = settings.shareId ? new URL(`/share/${settings.shareId}`, window.location.origin).toString() : "";

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const handleStopSharing = async () => {
    if (!settings.shareId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/conversations/${settings.conversationId}/shares/${settings.shareId}`, {
        method: "DELETE",
        body: JSON.stringify({
          slug: settings.slug,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete share");

      toast.success("Share link deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete share link");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>Share Link Created</DialogTitle>
        <DialogDescription>Anyone with this link can view this chat.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="shareUrl">Share URL</Label>
          <div className="flex gap-2">
            <Input id="shareUrl" type="text" value={shareUrl} readOnly className="flex-1" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopyUrl} className="shrink-0">
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col items-center w-full">
          <Button onClick={handleStopSharing} disabled={isDeleting} variant="destructive" className="w-full">
            {isDeleting ? <Loader2 className="animate-spin" /> : "Stop sharing"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
