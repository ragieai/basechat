import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SharedDialog({
  shareId,
  conversationId,
  slug,
  onClose,
}: {
  shareId: string | null;
  conversationId: string;
  slug: string;
  onClose: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shareUrl = shareId ? new URL(`/share/${shareId}`, window.location.origin).toString() : "";

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
    if (!shareId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/conversations/${conversationId}/shares/${shareId}`, {
        method: "DELETE",
        body: JSON.stringify({
          slug,
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
    <DialogContent className="sm:max-w-[425px] max-h-[90vh] !rounded-2xl [&>button]:hidden">
      <DialogHeader>
        <DialogTitle className="!text-md">Share public link to this chat</DialogTitle>
        <DialogDescription className="!text-black">Anyone with this link can view this chat.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Input id="shareUrl" type="text" value={shareUrl} readOnly className="pr-24" />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4 text-black" />
              <span className="text-sm text-black">{isCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        <DialogFooter className="flex !justify-start w-full mt-4 !flex-row">
          <button
            onClick={handleStopSharing}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 text-sm font-semibold"
          >
            {isDeleting ? <Loader2 className="animate-spin h-4 w-4 inline-block mr-2" /> : null}
            Stop sharing
          </button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
