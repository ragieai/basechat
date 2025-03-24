"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import LogoChanger from "@/components/tenant/logo/logo-changer";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTenantSchema } from "@/lib/api";
import { DEFAULT_GROUNDING_PROMPT, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import * as schema from "@/lib/server/db/schema";
import { cn } from "@/lib/utils";

import { HelpGroundingPromptDialog } from "./help-grounding-prompt-dialog";
import { HelpSystemPromptDialog } from "./help-system-prompt-dialog";

// Transform null to empty string for form field handling
const nullToEmptyString = (v: string | null) => v ?? "";

const formSchema = z.object({
  question1: z.string().nullable().transform(nullToEmptyString),
  question2: z.string().nullable().transform(nullToEmptyString),
  question3: z.string().nullable().transform(nullToEmptyString),
  groundingPrompt: z.string().nullable().default(DEFAULT_GROUNDING_PROMPT).transform(nullToEmptyString),
  systemPrompt: z.string().nullable().default(DEFAULT_SYSTEM_PROMPT).transform(nullToEmptyString),
});

type QuestionFieldProps = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  form: UseFormReturn<z.infer<typeof formSchema>, any, undefined>;
};

const QuestionField = ({ form, name, label }: QuestionFieldProps) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-col mt-8">
        <FormLabel className="font-semibold text-[16px] mb-3">{label}</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="Type something"
            className="rounded-[8px] border border-[#D7D7D7] h-[58px] placeholder-[#74747A] text-[16px]"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

type TextAreaFieldProps = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  form: UseFormReturn<z.infer<typeof formSchema>, any, undefined>;
  help?: React.ReactNode;
  className?: string;
};

const TextAreaField = ({ form, name, label, className, help }: TextAreaFieldProps) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={cn("flex flex-col", className)}>
        <FormLabel className="font-semibold text-[16px] mb-3 flex items-center gap-2">
          {label} {help}
        </FormLabel>
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

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
  canUploadLogo?: boolean;
};

export default function GeneralSettings({ tenant, canUploadLogo }: Props) {
  const [isLoading, setLoading] = useState(false);

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: formSchema.parse(formattedTenant),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const payload = updateTenantSchema.parse(values);
    const res = await fetch("/api/tenants/current", { method: "PATCH", body: JSON.stringify(payload) });
    setLoading(false);

    if (res.status !== 200) throw new Error("Failed to save");

    toast.success("Changes saved");

    // If the prompts are empty strings, set them to undefined so we get the default value from the schema.
    form.reset({
      ...values,
      groundingPrompt: values.groundingPrompt.length ? values.groundingPrompt : undefined,
      systemPrompt: values.systemPrompt.length ? values.systemPrompt : undefined,
    });
  }

  async function handleCancel() {
    form.reset();
  }

  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <div
        className={cn("flex w-full justify-between items-center", {
          "mb-8": !canUploadLogo,
        })}
      >
        <h1 className="font-bold text-[32px]">Settings</h1>
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
      {canUploadLogo && (
        <div>
          <div className="mb-2">
            <Label className="font-semibold text-[16px]">Avatar</Label>
          </div>
          <LogoChanger name={tenant.name} logoUrl={tenant.logoUrl} logoName={tenant.logoFileName} />
          <hr className="w-full my-8" />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h3 className="font-semibold text-[16px]">Example questions to help your users get started</h3>

            <QuestionField form={form} name="question1" label="Question 1" />
            <QuestionField form={form} name="question2" label="Question 2" />
            <QuestionField form={form} name="question3" label="Question 3" />

            <hr className="w-full my-8" />

            <TextAreaField
              form={form}
              name="groundingPrompt"
              label="Grounding Prompt"
              help={<HelpGroundingPromptDialog />}
            />

            <TextAreaField
              form={form}
              name="systemPrompt"
              label="System Prompt"
              help={<HelpSystemPromptDialog />}
              className="mt-8"
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
