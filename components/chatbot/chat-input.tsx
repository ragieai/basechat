import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { KeyboardEvent, useRef, useState } from "react";

import { LLMModel, LLM_MODELS, LLM_LOGO_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import CheckIcon from "../../public/icons/check.svg";
import { AutosizeTextarea, AutosizeTextAreaRef } from "../ui/autosize-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface ChatInputProps {
  handleSubmit?: (text: string) => void;
}

const ModelPopoverContent = ({ children }: { children: React.ReactNode }) => (
  <PopoverContent align="start" className={cn("bg-[#F5F5F7] w-[258px] border-none shadow-none rounded-[12px] p-6")}>
    {children}
  </PopoverContent>
);

export default function ChatInput(props: ChatInputProps) {
  const [value, setValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<LLMModel>("GPT-4o");
  const ref = useRef<AutosizeTextAreaRef>(null);

  const handleSubmit = (value: string) => {
    setValue("");

    const v = value.trim();
    v && props.handleSubmit && props.handleSubmit(v);
    ref.current?.textArea.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (event.key === "Enter" && event.shiftKey)) return;

    event.preventDefault();
    handleSubmit(value);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-end items-center">
        <AutosizeTextarea
          className="pt-1.5"
          ref={ref}
          placeholder="Send a message"
          minHeight={4}
          value={value}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
        <button onClick={() => handleSubmit(value)}>
          <svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M24.3125 12L11.6731 12M6.34685 16.1693H3.91254M6.34685 12.1464H1.51254M6.34685 8.12356H3.91254M10.6199 4.59596L23.8753 11.0228C24.6916 11.4186 24.6916 12.5814 23.8753 12.9772L10.6199 19.4041C9.71186 19.8443 8.74666 18.9161 9.15116 17.9915L11.582 12.4353C11.7034 12.1578 11.7034 11.8422 11.582 11.5647L9.15116 6.00848C8.74666 5.08391 9.71186 4.15568 10.6199 4.59596Z"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <Popover>
        <PopoverTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {selectedModel}
          <ChevronDown className="h-4 w-4" />
        </PopoverTrigger>
        <ModelPopoverContent>
          <div className="flex flex-col gap-1">
            {LLM_MODELS.map((model) => {
              const [displayName, logoPath] = LLM_LOGO_MAP[model];
              return (
                <button
                  key={model}
                  className="flex items-center rounded-sm px-4 py-3 text-sm text-left hover:bg-black hover:bg-opacity-5"
                  onClick={() => setSelectedModel(model)}
                >
                  <div className="w-4">{selectedModel === model && <Image src={CheckIcon} alt="selected" />}</div>
                  <div className="flex items-center ml-3">
                    <Image src={logoPath} alt={displayName} width={16} height={16} className="mr-2" />
                    <span>{model}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </ModelPopoverContent>
      </Popover>
    </div>
  );
}
