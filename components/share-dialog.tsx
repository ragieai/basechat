import { Loader2, Copy, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareSettings, ACCESS_TYPES, EXPIRES_AT_OPTIONS, AccessType } from "@/lib/api";
export default function ShareDialog({
  conversationId,
  onShare,
  isLoading,
}: {
  conversationId: string;
  onShare: (data: ShareSettings) => void;
  isLoading: boolean;
}) {
  const [accessType, setAccessType] = useState<AccessType>("public");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("0");
  const [existingShares, setExistingShares] = useState<
    Array<{
      shareId: string;
      accessType: AccessType;
      createdAt: string;
      expiresAt: string | null;
      recipientEmails: string[];
    }>
  >([]);
  const [isLoadingShares, setIsLoadingShares] = useState(true);

  const fetchExistingShares = async () => {
    try {
      setIsLoadingShares(true);
      const response = await fetch(`/api/conversations/${conversationId}/shares`);
      if (!response.ok) throw new Error("Failed to fetch shares");
      const data = await response.json();
      setExistingShares(data);
    } catch (error) {
      toast.error("Failed to load existing share links");
    } finally {
      setIsLoadingShares(false);
    }
  };

  useEffect(() => {
    fetchExistingShares();
  }, [conversationId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedExpiresAt = parseInt(expiresAt);
    await onShare({
      accessType,
      email: accessType === "email" ? email : undefined,
      expiresAt: parsedExpiresAt > 0 ? Date.now() + parsedExpiresAt * 60 * 60 * 1000 : undefined,
    });
    fetchExistingShares();
  };

  return (
    <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
      <ScrollArea className="h-full max-h-[80vh] pr-4">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>Choose how you want to share this conversation.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Access Type</Label>
            <RadioGroup
              value={accessType}
              onValueChange={(value) => setAccessType(value as AccessType)}
              className="grid gap-2"
            >
              {ACCESS_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value}>{type.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {accessType === "email" && (
            <div className="grid gap-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="expiresAt">Link Expiration</Label>
            <Select value={expiresAt} onValueChange={setExpiresAt}>
              <SelectTrigger>
                <SelectValue placeholder="Select when link expires" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRES_AT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Create Share Link"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-4">Existing Share Links</h3>
          {isLoadingShares ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" />
            </div>
          ) : existingShares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No existing share links</p>
          ) : (
            <div className="space-y-3">
              {existingShares.map((share) => (
                <div key={share.shareId} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {share.accessType === "public"
                        ? "Public"
                        : share.accessType === "organization"
                          ? "Organization"
                          : `Email: ${share.recipientEmails.join(", ")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(share.createdAt).toLocaleDateString()}
                    </p>
                    {share.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(share.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const shareUrl = new URL(`/share/${share.shareId}`, window.location.origin).toString();
                        navigator.clipboard.writeText(shareUrl);
                        toast.success("Share link copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/conversations/${conversationId}/share/${share.shareId}`, {
                            method: "DELETE",
                          });
                          if (!response.ok) throw new Error("Failed to delete share link");
                          setExistingShares((shares) => shares.filter((s) => s.shareId !== share.shareId));
                          toast.success("Share link deleted");
                        } catch (error) {
                          toast.error("Failed to delete share link");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </DialogContent>
  );
}
