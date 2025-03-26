import { ChevronRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import { KeyboardEvent, useRef, useState, useEffect } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { LLMModel, ALL_VALID_MODELS, LLM_LOGO_MAP, LLM_DISPLAY_NAMES } from "@/lib/llm/types";
import { cn } from "@/lib/utils";

import CheckIcon from "../../public/icons/check.svg";
import { AutosizeTextarea, AutosizeTextAreaRef } from "../ui/autosize-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface ChatInputProps {
  handleSubmit?: (text: string, model: LLMModel) => void;
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  isBreadth: boolean;
  onBreadthChange: (isBreadth: boolean) => void;
  rerankEnabled?: boolean;
  onRerankChange?: (enabled: boolean) => void;
  prioritizeRecent?: boolean;
  onPrioritizeRecentChange?: (enabled: boolean) => void;
}

const useIsDesktop = () => {
  // whether to display model popover to the right of settings or on top
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 640); // sm breakpoint
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);

    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  return isDesktop;
};

const SettingsPopoverContent = ({ children }: { children: React.ReactNode }) => (
  <PopoverContent
    align="start"
    sideOffset={4}
    className={cn("bg-[#F5F5F7] w-[300px] border border-[#D7D7D7] shadow-none rounded-[6px] p-6")}
  >
    {children}
  </PopoverContent>
);

const ModelPopoverContent = ({ children }: { children: React.ReactNode }) => {
  const isDesktop = useIsDesktop();

  return (
    <PopoverContent
      align="end"
      alignOffset={-24}
      {...(isDesktop ? { side: "right", sideOffset: 30 } : {})}
      className={cn("bg-[#F5F5F7] w-[258px] border border-[#D7D7D7] shadow-none rounded-[8px] p-6")}
    >
      {children}
    </PopoverContent>
  );
};

export default function ChatInput(props: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isBreadth, setIsBreadth] = useState(props.isBreadth);
  const [rerankEnabled, setRerankEnabled] = useState(props.rerankEnabled ?? false);
  const [prioritizeRecent, setPrioritizeRecent] = useState(props.prioritizeRecent ?? false);
  const ref = useRef<AutosizeTextAreaRef>(null);

  const handleSubmit = (value: string) => {
    setValue("");

    const v = value.trim();
    v && props.handleSubmit && props.handleSubmit(v, props.selectedModel);
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
          {LLM_DISPLAY_NAMES[props.selectedModel]}
          <ChevronDown className="h-4 w-4" />
        </PopoverTrigger>
        <SettingsPopoverContent>
          <div className="flex flex-col gap-4">
            <span className="text-sm text-muted-foreground">Chat settings</span>
            <div className="flex flex-col gap-2">
              <RadioGroup
                value={isBreadth ? "breadth" : "depth"}
                onValueChange={(value) => {
                  const newIsBreadth = value === "breadth";
                  setIsBreadth(newIsBreadth);
                  props.onBreadthChange(newIsBreadth);
                }}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="breadth"
                      id="breadth"
                      className="text-[#D946EF] border-[#D7D7D7] data-[state=checked]:bg-[#D946EF]"
                    />
                    <label htmlFor="breadth" className="text-sm">
                      Breadth
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    Searches a wider range of documents for a broader response (slower)
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="depth"
                      id="depth"
                      className="text-[#D946EF] border-[#D7D7D7] data-[state=checked]:bg-[#D946EF]"
                    />
                    <label htmlFor="depth" className="text-sm">
                      Depth
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    Retrieves results from a smaller range of documents for more depth (faster)
                  </span>
                </div>
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Rerank</span>
                </div>
                <Switch
                  checked={rerankEnabled}
                  onCheckedChange={(checked: boolean) => {
                    setRerankEnabled(checked);
                    props.onRerankChange?.(checked);
                  }}
                  className="data-[state=checked]:bg-[#D946EF]"
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Prioritize recent data</span>
                </div>
                <Switch
                  checked={prioritizeRecent}
                  onCheckedChange={(checked: boolean) => {
                    setPrioritizeRecent(checked);
                    props.onPrioritizeRecentChange?.(checked);
                  }}
                  className="data-[state=checked]:bg-[#D946EF]"
                />
              </div>
            </div>
            <div className="h-[1px] w-full bg-[#D7D7D7] my-4" />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-black">Switch model</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground">
                    <span className="text-[#6B7280]">{LLM_DISPLAY_NAMES[props.selectedModel]}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <ModelPopoverContent>
                  <div className="flex flex-col gap-1">
                    {ALL_VALID_MODELS.map((model) => {
                      const [_, logoPath] = LLM_LOGO_MAP[model];
                      return (
                        <button
                          key={model}
                          className="flex items-center rounded-sm px-4 py-3 text-sm text-left hover:bg-black hover:bg-opacity-5"
                          onClick={() => props.onModelChange(model)}
                        >
                          <div className="w-4">
                            {props.selectedModel === model && <Image src={CheckIcon} alt="selected" />}
                          </div>
                          <div className="flex items-center ml-3">
                            <Image
                              src={logoPath}
                              alt={LLM_DISPLAY_NAMES[model]}
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                            <span>{LLM_DISPLAY_NAMES[model]}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ModelPopoverContent>
              </Popover>
            </div>
          </div>
        </SettingsPopoverContent>
      </Popover>
    </div>
  );
}
