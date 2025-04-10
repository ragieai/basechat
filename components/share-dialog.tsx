import { Loader2 } from "lucide-react";

import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import PrimaryButton from "./primary-button";

export default function ShareDialog({ onShare, isLoading }: { onShare: () => void; isLoading: boolean }) {
  const handleShare = async () => {
    await onShare();
  };

  return (
    <DialogContent className="sm:max-w-[425px] max-h-[90vh] !rounded-2xl">
      <DialogHeader>
        <DialogTitle className="!text-md">Share public link to this chat</DialogTitle>
        <DialogDescription className="!text-black">
          Once created, anyone with the link can view this chat.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        <DialogFooter className="flex flex-col items-center w-full !justify-center">
          <PrimaryButton onClick={handleShare} disabled={isLoading} className="!w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : "Create public link"}
          </PrimaryButton>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
