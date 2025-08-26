"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { updateCompletedWelcomeFlow } from "@/app/(main)/o/[slug]/user-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface WelcomeDialogProps {
  displayWelcome: boolean;
  userId: string;
}

type Page = "welcome" | "connectors" | "invite" | "slack" | "conclusion";

function ProgressDots({ currentPage }: { currentPage: Page }) {
  if (!["connectors", "invite", "slack"].includes(currentPage)) return null;

  const currentIndex = currentPage === "connectors" ? 0 : currentPage === "invite" ? 1 : 2;

  return (
    <div className="flex justify-center gap-2 absolute bottom-3 left-0 right-0">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full ${index === currentIndex ? "bg-[color:var(--brand)]" : "bg-[#D9D9D9]"}`}
        />
      ))}
    </div>
  );
}

export function WelcomeDialog({ displayWelcome, userId }: WelcomeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("welcome");

  useEffect(() => {
    if (displayWelcome) {
      setIsOpen(true);
    }
  }, [displayWelcome]);

  const handleClose = async () => {
    try {
      await updateCompletedWelcomeFlow(userId);
    } catch (error) {
      console.error("Failed to update welcome flow completion:", error);
    }
  };

  const handleNext = () => {
    switch (currentPage) {
      case "welcome":
        setCurrentPage("connectors");
        break;
      case "connectors":
        setCurrentPage("invite");
        break;
      case "invite":
        setCurrentPage("slack");
        break;
      case "slack":
        setCurrentPage("conclusion");
        break;
      case "conclusion":
        handleClose();
        setIsOpen(false);
        break;
    }
  };

  const handleBack = () => {
    switch (currentPage) {
      case "connectors":
        setCurrentPage("welcome");
        break;
      case "invite":
        setCurrentPage("connectors");
        break;
      case "slack":
        setCurrentPage("invite");
        break;
      case "conclusion":
        setCurrentPage("slack");
        break;
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case "welcome":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Welcome to Base Chat 👋</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-surface-text-tertiary text-base font-medium mb-16">
              <p>
                Your team&apos;s knowledge base is now just a question away. <br />
                We&apos;ll show you a few quick tips to help you get the most of it.
              </p>
              <div className="flex justify-between items-center absolute bottom-6 left-6 right-6">
                <button
                  onClick={async () => {
                    await handleClose();
                    setIsOpen(false);
                  }}
                  className="text-[#D946EF] hover:text-[#D946EF]/90 text-sm font-medium focus:outline-none focus:ring-0"
                >
                  Skip for now
                </button>
                <Button
                  onClick={handleNext}
                  className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 font-medium"
                >
                  Let&apos;s go
                </Button>
              </div>
            </div>
          </>
        );
      case "connectors":
        return (
          <>
            <div className="bg-[#F5F5F7] -mx-6 -mt-6 h-[260px] flex flex-col items-center justify-center rounded-t-lg relative">
              <Image
                src="/welcome/connectors.svg"
                alt="Data connectors illustration"
                className="w-[519px] h-auto object-contain"
                width={519}
                height={100}
              />
              <ProgressDots currentPage={currentPage} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add your data to get started</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-surface-text-tertiary text-base font-medium">
              <p>
                Upload files or connect your data sources—whatever works for you. You&apos;re always in control of what
                data is shared with Base Chat and can manage it anytime. <br />
                <br />
                Click on the <span className="font-bold">Data</span> tab to get started.
              </p>
              <div className="h-16" />
              <div className="flex justify-between items-center absolute bottom-6 left-6 right-6">
                <button
                  onClick={async () => {
                    await handleClose();
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground text-sm font-medium"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button onClick={handleBack} className="text-muted-foreground text-sm pr-2 font-medium">
                    Back
                  </button>
                  <Button
                    onClick={handleNext}
                    className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      case "invite":
        return (
          <>
            <div className="bg-[#F5F5F7] -mx-6 -mt-6 h-[260px] flex flex-col items-center justify-center rounded-t-lg relative">
              <Image
                src="/welcome/invite.svg"
                alt="Team invitation illustration"
                className="w-[330px] h-[222px] object-contain"
                width={330}
                height={222}
              />
              <ProgressDots currentPage={currentPage} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Bring your team along</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-surface-text-tertiary text-base font-medium">
              <p>
                After you&apos;ve added some data, invite your teammates so they can start chatting in Base Chat. You
                control who can access your chatbot and who&apos;s allowed to add or manage data. <br />
                <br />
                Head to <span className="font-bold">Settings &gt; Users</span> to invite your team.
              </p>
              <div className="h-16" />
              <div className="flex justify-between items-center absolute bottom-6 left-6 right-6">
                <button
                  onClick={async () => {
                    await handleClose();
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground text-sm font-medium"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button onClick={handleBack} className="text-muted-foreground text-sm pr-2 font-medium">
                    Back
                  </button>
                  <Button
                    onClick={handleNext}
                    className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      case "slack":
        return (
          <>
            <div className="bg-[#F5F5F7] -mx-6 -mt-6 h-[260px] flex flex-col items-center justify-center rounded-t-lg relative">
              <Image
                src="/welcome/slack.svg"
                alt="Slack integration illustration"
                className="w-[449px] h-[217px] object-contain"
                width={449}
                height={217}
              />
              <ProgressDots currentPage={currentPage} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Use Base Chat in Slack</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-surface-text-tertiary text-base font-medium">
              <p>
                Add Base Chat to a channel and let your team ask questions without leaving Slack. Fast answers, right
                where work happens. <br />
                <br />
                Head to <span className="font-bold">Settings &gt; Slack</span> to get started.
              </p>
              <div className="h-16" />
              <div className="flex justify-between items-center absolute bottom-6 left-6 right-6">
                <button
                  onClick={async () => {
                    await handleClose();
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground text-sm font-medium"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button onClick={handleBack} className="text-muted-foreground text-sm pr-2 font-medium">
                    Back
                  </button>
                  <Button
                    onClick={handleNext}
                    className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      case "conclusion":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">You&apos;re all set!</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-surface-text-tertiary text-base font-medium mb-16">
              <p>
                Base Chat is ready when you are. Have questions or need help? You can always reach us at{" "}
                <a href="mailto:support@ragie.ai" className="text-[#D946EF] hover:text-[#D946EF]/90">
                  support@ragie.ai
                </a>
                .
              </p>
              <div className="flex justify-between items-center absolute bottom-6 left-6 right-6">
                <button
                  onClick={async () => {
                    await handleClose();
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground text-sm font-medium"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button onClick={handleBack} className="text-muted-foreground text-sm pr-2 font-medium">
                    Back
                  </button>
                  <Button
                    onClick={handleNext}
                    className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 font-medium"
                  >
                    Start chatting
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={async (open) => {
        if (!open) {
          await handleClose();
        }
        setIsOpen(open);
      }}
    >
      <DialogContent
        className={`sm:max-w-[519px] bg-[#FFFFFF] ${
          ["connectors", "invite", "slack"].includes(currentPage)
            ? "h-[578px]"
            : ["welcome", "conclusion"].includes(currentPage)
              ? "h-[272px]"
              : ""
        }`}
        hideClose
      >
        {renderPageContent()}
      </DialogContent>
    </Dialog>
  );
}
