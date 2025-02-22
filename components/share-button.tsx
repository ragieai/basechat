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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlusIcon from "@/public/icons/plus.svg";

import { CopyIcon } from "@/public/icons/copy.svg";

interface ShareButtonProps {
  conversationId: string;
  className?: string;
}

const EXPIRES_AT_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
];

const ACCESS_TYPES = [
  { label: "Public - Anyone with the link", value: "public" },
  { label: "Organization - Only members", value: "organization" },
  { label: "Email - Specific person", value: "email" },
] as const;

type AccessType = (typeof ACCESS_TYPES)[number]["value"];

function ShareDialog({ onShare }: { onShare: (data: ShareSettings) => void }) {
  const [accessType, setAccessType] = useState<AccessType>("public");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("0");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedExpiresAt = parseInt(expiresAt);
    onShare({
      accessType,
      email: accessType === "email" ? email : undefined,
      expiresAt: parsedExpiresAt > 0 ? Date.now() + parsedExpiresAt * 60 * 60 * 1000 : undefined,
    });
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
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
          <Button type="submit">Create Share Link</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface ShareSettings {
  accessType: AccessType;
  email?: string;
  expiresAt?: number;
}

export function ShareButton({ conversationId, className }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null);

  const handleShare = async (settings: ShareSettings) => {
    try {
      // TODO: Implement actual sharing logic here with the settings
      console.log("Share settings:", settings);
      setShareSettings(settings);
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
        <SharedDialog conversationId={conversationId} settings={shareSettings!} onClose={() => setIsShared(false)} />
      ) : (
        <ShareDialog onShare={handleShare} />
      )}
    </Dialog>
  );
}

function SharedDialog({
  conversationId,
  settings,
  onClose,
}: {
  conversationId: string;
  settings: ShareSettings;
  onClose: () => void;
}) {
  const shareUrl = new URL(`/share/${conversationId}`, window.location.href).toString();

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
