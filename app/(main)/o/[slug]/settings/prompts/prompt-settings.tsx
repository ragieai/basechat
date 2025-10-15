"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateTenantSchema } from "@/lib/api";
import { DEFAULT_GROUNDING_PROMPT, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import * as schema from "@/lib/server/db/schema";
import { cn } from "@/lib/utils";

import { HelpGroundingPromptDialog } from "../help-grounding-prompt-dialog";
import { HelpSystemPromptDialog } from "../help-system-prompt-dialog";

// Transform null to empty string for form field handling
const nullToEmptyString = (v: string | null) => v ?? "";

const formSchema = z.object({
  groundingPrompt: z.string().nullable().default(DEFAULT_GROUNDING_PROMPT).transform(nullToEmptyString),
  systemPrompt: z.string().nullable().default(DEFAULT_SYSTEM_PROMPT).transform(nullToEmptyString),
});

type FormValues = z.infer<typeof formSchema>;

type TextAreaFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
  help?: React.ReactNode;
  className?: string;
  hasDefault?: boolean;
  description?: string;
};

const TextAreaField = ({ form, name, label, className, help, hasDefault, description }: TextAreaFieldProps) => {
  const getDefaultValue = () => {
    switch (name) {
      case "systemPrompt":
        return DEFAULT_SYSTEM_PROMPT;
      case "groundingPrompt":
        return DEFAULT_GROUNDING_PROMPT;
      default:
        return "";
    }
  };

  const handleReset = () => {
    form.setValue(name, getDefaultValue(), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col", className)}>
          <FormLabel className="font-semibold text-base mb-1 flex items-center justify-between text-[#343A40]">
            <div className="flex items-center gap-2">
              {label} {help}
            </div>
            {hasDefault && (
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-[#D946EF] hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </FormLabel>
          {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
          <FormControl>
            <div className="rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
              <AutosizeTextarea className="pt-1.5" minHeight={80} {...field} />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
};

export default function PromptSettings({ tenant }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const formattedTenant = useMemo(() => {
    const { groundingPrompt, systemPrompt, ...otherFields } = tenant;

    // Zod only uses default values when the value is undefined. They come in as null
    // Change fields you want to have defaults to undefined.
    return {
      groundingPrompt: groundingPrompt ? groundingPrompt : undefined,
      systemPrompt: systemPrompt ? systemPrompt : undefined,
      ...otherFields,
    };
  }, [tenant]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: formSchema.parse(formattedTenant),
  });

  if (!mounted) return null;

  async function onSubmit(values: FormValues) {
    setLoading(true);

    try {
      const payload = updateTenantSchema.parse(values);
      const res = await fetch("/api/tenants/current", {
        method: "PATCH",
        headers: { tenant: tenant.slug },
        body: JSON.stringify(payload),
      });

      if (res.status !== 200) throw new Error("Failed to save");

      toast.success("Changes saved");

      // If the prompts are empty strings, set them to undefined so we get the default value from the schema.
      form.reset({
        ...values,
        groundingPrompt: values.groundingPrompt.length ? values.groundingPrompt : undefined,
        systemPrompt: values.systemPrompt.length ? values.systemPrompt : undefined,
      });
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    form.reset();
  }

  return (
    <div className="w-full p-4 flex-grow flex flex-col relative">
      <div className="flex w-full justify-between items-center mb-12">
        <h1 className="font-bold text-[32px] text-[#343A40]">Prompts</h1>
        <div className="flex justify-end">
          <button
            type="reset"
            className="rounded-lg disabled:opacity-[55%] px-4 py-2.5 mr-3"
            disabled={!form.formState.isDirty}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#D946EF] text-white disabled:opacity-[55%] px-4 py-2.5 flex items-center"
            disabled={!form.formState.isDirty || isLoading}
            onClick={form.handleSubmit(onSubmit)}
          >
            Save
            {isLoading && <Loader2 size={18} className="ml-2 animate-spin" />}
          </button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <TextAreaField
              form={form}
              name="groundingPrompt"
              label="Grounding Prompt"
              help={<HelpGroundingPromptDialog />}
              hasDefault={true}
              description="The content first sent to the LLM before any message. This is used to help tune the responses the LLM outputs."
            />

            <TextAreaField
              form={form}
              name="systemPrompt"
              label="System Prompt"
              help={<HelpSystemPromptDialog />}
              className="mt-8 mb-4"
              hasDefault={true}
              description="The content sent to the LLM when the relevant chunks for the query are received. It wraps the chunks in this message."
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
