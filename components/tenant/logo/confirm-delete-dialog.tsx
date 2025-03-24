"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormCancelButton } from "@/components/ui/form-cancel-button";
import { SubmitButton } from "@/components/ui/submit-button";

import { deleteLogo } from "./server-actions";

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
  tenant: {
    slug: string;
  };
}

export function ConfirmDeleteLogoDialog({ onCancel, onSuccess, tenant }: Props) {
  const [state, formAction] = useActionState(deleteLogo, {
    status: "pending" as const,
  });

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    } else if (state.status === "error") {
      toast.error("Unable to delete logo");
    }
  }, [state, onSuccess]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onCancel?.();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete logo</DialogTitle>
        </DialogHeader>
        <div>Are you sure you want to delete the logo?</div>
        <form action={formAction}>
          <DialogFooter>
            <DialogClose asChild>
              <FormCancelButton>Cancel</FormCancelButton>
            </DialogClose>
            <SubmitButton>Delete</SubmitButton>
          </DialogFooter>
          <input type="hidden" name="slug" value={tenant.slug} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
