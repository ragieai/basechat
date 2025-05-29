"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PaymentRequiredDialogProps {
  tenant: {
    paidStatus: string;
  };
}

export function PaymentRequiredDialog({ tenant }: PaymentRequiredDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (tenant.paidStatus === "expired") {
      setIsOpen(true);
    }
  }, [tenant.paidStatus]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing if the tenant is not expired
        if (tenant.paidStatus !== "expired") {
          setIsOpen(open);
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          {tenant.paidStatus !== "expired" && (
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          )}
          <DialogTitle className="text-xl font-semibold">Let&apos;s keep the conversation going.</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-surface-text-tertiary text-sm">
          <p>
            Your trial has ended, but exploring your knowledge base doesn&apos;t have to. Upgrade to a paid plan to
            continue using Base Chat. It&apos;s just $18 per user/month, plus a data plan.
          </p>
          <Button
            className="bg-[#D946EF] text-white hover:bg-[#D946EF]/90 w-fit"
            onClick={() => (window.location.href = "/pricing")}
          >
            View plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
