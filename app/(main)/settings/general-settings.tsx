"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import LogoChanger from "@/components/tenant/logo/logo-changer";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  isPublic: z.boolean().default(false),
  slug: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || /^[a-zA-Z0-9-]+$/.test(val), "Slug can only contain letters, numbers, and hyphens"),
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
            value={field.value as string}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const PublicChatField = ({
  form,
  isCheckingSlug,
  slugError,
  tenantName,
}: {
  form: UseFormReturn<z.infer<typeof formSchema>, any, undefined>;
  isCheckingSlug: boolean;
  slugError: string | null;
  tenantName: string;
}) => {
  // Generate slug when public chat is enabled
  const handlePublicChange = async (checked: boolean) => {
    form.setValue("isPublic", checked);

    if (checked) {
      try {
        const response = await fetch(`/api/tenants/generate-slug?name=${encodeURIComponent(tenantName)}`);
        const data = await response.json();
        form.setValue("slug", data.slug);
      } catch (error) {
        console.error("Failed to generate slug:", error);
      }
    } else {
      form.setValue("slug", "");
    }
  };

  return (
    <div className="relative">
      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 overflow-hidden">
            <div className="space-y-0.5 flex-1">
              <FormLabel className="text-base">Enable Public Chat</FormLabel>
              <div className="text-sm text-muted-foreground">
                Allow anyone to chat with your AI assistant without signing up
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={handlePublicChange} />
              </FormControl>
            </div>
          </FormItem>
        )}
      />

      {form.watch("isPublic") && (
        <div className="mt-4">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Public URL Slug</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="your-chat-name"
                      className="rounded-[8px] border border-[#D7D7D7] h-[58px] placeholder-[#74747A] text-[16px]"
                      {...field}
                    />
                    {isCheckingSlug && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                </FormControl>
                <div className="text-sm text-muted-foreground mt-1">
                  Your chat will be available at: {location.origin}/o/{field.value || "your-chat-name"}
                </div>
                {slugError && <div className="text-sm text-destructive mt-1">{slugError}</div>}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
};

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
            <AutosizeTextarea className="pt-1.5" minHeight={80} {...field} value={field.value as string} />
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
    const { groundingPrompt, systemPrompt, slug, ...otherFields } = tenant;

    // Zod only uses default values when the value is undefined. They come in as null
    // Change fields you want to have defaults to undefined.
    return {
      groundingPrompt: groundingPrompt ? groundingPrompt : undefined,
      systemPrompt: systemPrompt ? systemPrompt : undefined,
      slug: slug ? slug : undefined,
      ...otherFields,
    };
  }, [tenant]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: formSchema.parse(formattedTenant),
  });

  // Add debounced slug validation
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const checkSlugUniqueness = async (slug: string) => {
    if (!slug) {
      setSlugError(null);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const response = await fetch(`/api/tenants/check-slug?slug=${encodeURIComponent(slug)}&tenantId=${tenant.id}`);
      const data = await response.json();

      if (!data.isUnique) {
        setSlugError("This URL is already taken");
      } else {
        setSlugError(null);
      }
    } catch (error) {
      setSlugError("Failed to check URL availability");
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Watch for slug changes and validate
  const slug = form.watch("slug");
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkSlugUniqueness(slug);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [slug]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (slugError) {
      toast.error("Please choose a different URL");
      return;
    }
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

            <hr className="w-full my-8" />
            <h3 className="font-semibold text-[16px]">Public Chat Settings</h3>
            <PublicChatField
              form={form}
              isCheckingSlug={isCheckingSlug}
              slugError={slugError}
              tenantName={tenant.name}
            />
            <div className="h-16" />
          </div>
        </form>
      </Form>
    </div>
  );
}
