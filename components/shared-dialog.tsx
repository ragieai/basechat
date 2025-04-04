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
  settings: ShareSettings & { shareId?: string };
  onClose: () => void;
}) {
  // Use the new share URL format without tenant slug
  const shareUrl = settings.shareId ? new URL(`/share/${settings.shareId}`, window.location.origin).toString() : "";

  const getShareDescription = () => {
    switch (settings.accessType) {
      case "public":
        return "Anyone with this link can view the conversation.";
      case "organization":
        return "Only organization members with this link can view the conversation.";
      case "email":
        return `Only ${settings.email} can access this conversation.`;
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share Link Created</DialogTitle>
        <div className="space-y-2">
          <DialogDescription>{getShareDescription()}</DialogDescription>
          {settings.expiresAt && (
            <p className="text-sm text-muted-foreground">
              Expires:{" "}
              {new Date(settings.expiresAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="shareUrl">Share URL</Label>
        <div className="flex gap-2">
          <Input id="shareUrl" type="text" value={shareUrl} readOnly className="flex-1" />
        </div>
      </div>
      {settings.accessType === "email" && (
        <div className="flex flex-col gap-2">
          <Label>Recipient</Label>
          <div className="text-sm text-muted-foreground">{settings.email}</div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Create Another Link
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
