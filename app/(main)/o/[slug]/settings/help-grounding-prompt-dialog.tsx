"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function HelpGroundingPromptDialog() {
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
            The Grounding Prompt is content first sent to an LLM before any message. This is used to help tune the
            responses the LLM outputs. You can use this to change the language, tone, or any style of the response.
          </p>
          <h3 className="font-bold">Variables</h3>
          <p>
            Each prompt has access to some variables like the company&apos;s name. To use these as part of your prompt
            wrap the variable in curly braces like so: &#123;&#123;company.name&#125;&#125; Here are the variables
            available
          </p>

          <table className="table-auto border border-collapse mt-4">
            <thead>
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">company.name</td>
                <td className="border p-2">Your company name</td>
                <td className="border p-2">Acme Co.</td>
              </tr>
              <tr>
                <td className="border p-2">now</td>
                <td className="border p-2">The current date and time</td>
                <td className="border p-2">2025-02-26T21:39:10.969Z</td>
              </tr>
            </tbody>
          </table>
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
