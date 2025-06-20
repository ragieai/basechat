import { Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { getSeatChangePreview } from "@/app/(main)/o/[slug]/settings/billing/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SeatChangePreview } from "@/lib/orb-types";

interface ManageSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSeats: number;
  onSave: (newSeats: number) => void;
  tenantId: string;
  lightBackground?: boolean;
  initialOpenSeats: number;
  initialAdditionalSeats?: number;
  inviteFlow?: boolean;
}

export function ManageSeatsDialog({
  open,
  onOpenChange,
  currentSeats,
  onSave,
  tenantId,
  lightBackground,
  initialOpenSeats,
  initialAdditionalSeats = 0,
  inviteFlow = false,
}: ManageSeatsDialogProps) {
  const [additionalSeats, setAdditionalSeats] = useState(initialAdditionalSeats);
  const [debouncedAdditionalSeats, setDebouncedAdditionalSeats] = useState(initialAdditionalSeats);
  const [preview, setPreview] = useState<SeatChangePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(
    async (nextCount: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const previewData = await getSeatChangePreview(tenantId, nextCount);
        if (!previewData) {
          throw new Error("No preview data received");
        }
        setPreview(previewData);
      } catch (error) {
        console.error("Error fetching preview:", error);
        setError(error instanceof Error ? error.message : "Failed to load preview data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, setPreview, setIsLoading, setError],
  );

  // Update additionalSeats when initialAdditionalSeats changes
  useEffect(() => {
    if (open) {
      setAdditionalSeats(initialAdditionalSeats);
      setDebouncedAdditionalSeats(initialAdditionalSeats);
    }
  }, [open, initialAdditionalSeats]);

  // Debounce the additional seats value
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setDebouncedAdditionalSeats(additionalSeats);
    }, 1500);

    return () => clearTimeout(timer);
  }, [additionalSeats]);

  // Fetch preview when debounced value changes
  useEffect(() => {
    if (open) {
      const totalSeats = currentSeats + debouncedAdditionalSeats;
      fetchPreview(totalSeats);
    }
  }, [open, debouncedAdditionalSeats, fetchPreview, currentSeats]);

  const handleIncrement = () => setAdditionalSeats((s) => s + 1);
  const handleDecrement = () =>
    setAdditionalSeats((s) => {
      // Prevent total seats from going below 1
      if (currentSeats + s <= 1) return s;
      return s - 1;
    });
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;

    const maxNegative = -(currentSeats - 1);
    const minOpenSeats = -(initialOpenSeats - initialAdditionalSeats);

    // Calculate what the open seats would be with this value
    const resultingOpenSeats = initialOpenSeats - initialAdditionalSeats + value;
    if (resultingOpenSeats >= 0) {
      setAdditionalSeats(Math.max(maxNegative, value));
    } else {
      // If invalid, set to the minimum allowed value
      setAdditionalSeats(Math.max(maxNegative, minOpenSeats));
    }
  };
  const handleSave = () => {
    const totalSeats = currentSeats + additionalSeats;
    onSave(totalSeats);
    onOpenChange(false);
  };

  const currentPayment = preview?.currentSeatCharge || 0;
  const immediatePayment = preview?.immediateSeatCharge || 0;
  const upcomingPayment = preview?.upcomingSeatCharge || currentPayment;
  const totalSeats = currentSeats + additionalSeats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[450px]"
        lightBackground={lightBackground}
        closeOnOutsideClick={!inviteFlow}
        hideClose={inviteFlow}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Add or remove open seats</DialogTitle>
        </DialogHeader>

        {/* Seat Counter Section */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-0">
            {currentSeats + additionalSeats <= 1 || initialOpenSeats + additionalSeats - initialAdditionalSeats <= 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleDecrement}
                        aria-label="Decrease seats"
                        className="w-12 h-12 rounded-none text-xl"
                        disabled
                      >
                        -
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      No more open seats. Please
                      <br /> remove one or more users first.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                aria-label="Decrease seats"
                className="w-12 h-12 rounded-none text-xl"
              >
                -
              </Button>
            )}
            <Input
              type="text"
              min={1}
              value={additionalSeats}
              onChange={handleInput}
              className="w-12 h-12 text-center text-xl rounded-none"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrement}
              aria-label="Increase seats"
              className="w-12 h-12 rounded-none text-xl"
            >
              +
            </Button>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold">{totalSeats} total seats</div>
            <div className="text-muted-foreground text-sm">$18/mo</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {initialOpenSeats + additionalSeats - initialAdditionalSeats} open seats
        </div>

        {/* Payment Information Sections */}
        {error ? (
          <div className="text-sm text-destructive py-4">An error occurred</div>
        ) : (
          <div className="relative space-y-6">
            {/* Current Payment Section */}
            <hr className="border-[#D7D7D7]" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current Payment</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">$18 x {currentSeats}</span>
                <span className="text-lg font-medium">
                  ${currentPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /
                  month
                </span>
              </div>
            </div>

            {/* Next Payment Section */}
            <hr className="border-[#D7D7D7]" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Next Payment</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">$18 x {totalSeats}</span>
                <span className="text-lg font-medium">
                  ${upcomingPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /
                  month
                </span>
              </div>
            </div>

            {/* Immediate Payment Section */}
            <hr className="border-[#D7D7D7]" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Total Due Today</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">One-time charge</span>
                <span className="text-lg font-medium text-primary">
                  {immediatePayment > 0
                    ? `$${immediatePayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "-"}
                </span>
              </div>
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Footer Section */}
        <DialogFooter className="mt-6">
          <div className="w-full">
            <div className="text-xs text-muted-foreground text-left w-full mb-3">
              By continuing, your payment method will be charged the Total Due Today and the New Payment starting next
              billing cycle, until changed or cancelled.
            </div>
            <div className="flex flex-row gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {inviteFlow ? "Back" : "Cancel"}
                </Button>
              </DialogClose>
              <Button onClick={handleSave} disabled={additionalSeats === 0 || isLoading}>
                {isLoading
                  ? "Loading..."
                  : additionalSeats !== 0
                    ? additionalSeats > 0
                      ? `Confirm add ${additionalSeats} ${additionalSeats === 1 ? "seat" : "seats"}`
                      : `Confirm remove ${Math.abs(additionalSeats)} ${Math.abs(additionalSeats) === 1 ? "seat" : "seats"}`
                    : "No change"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
