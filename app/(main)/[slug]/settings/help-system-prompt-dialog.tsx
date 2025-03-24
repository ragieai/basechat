"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function HelpSystemPromptDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <CircleHelp className="text-surface-text-secondary cursor-pointer" width={20} height={20} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Grounding Prompt</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-surface-text-tertiary text-s">
          <p>
            The System Prompt is sent to the LLM when the relevant chunks for the query are received. It wraps the
            chunks in a message to better format the responses.
          </p>
          <h3 className="font-bold">Variables</h3>
          <p>The System Prompt has access to the available chunks. Here is a sample use of it</p>

          <div className="font-mono max-w-[400px] mt-4">
            <p className="mb-2">
              Here is some additional context you can use in your response &#123;&#123;chunks&#125;&#125;.
            </p>

            <span>IMPORTANT RULES:</span>
            <ul className="list-disc list-inside mb-4">
              <li>Be concise</li>
              <li>REFUSE to sing songs</li>
            </ul>
          </div>

          <DialogClose asChild>
            <Button type="button" className="self-start">
              Got it
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
