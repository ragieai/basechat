"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { DEFAULT_WELCOME_MESSAGE } from "@/lib/constants";
import { getSettingsPath } from "@/lib/paths";
import * as schema from "@/lib/server/db/schema";
import { cn } from "@/lib/utils";

import { HelpWelcomeMessageDialog } from "./help-welcome-message-dialog";

// Transform null to empty string for form field handling
const nullToEmptyString = (v: string | null) => v ?? "";

const isValidSlug = (slug: string) => {
  if (!slug || slug.trim().length === 0) return false;
  const sanitized = slug
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === sanitized;
};

const formSchema = z.object({
  question1: z.string().nullable().transform(nullToEmptyString),
  question2: z.string().nullable().transform(nullToEmptyString),
  question3: z.string().nullable().transform(nullToEmptyString),
  welcomeMessage: z.string().nullable().default(DEFAULT_WELCOME_MESSAGE).transform(nullToEmptyString),
  name: z.string().min(1, "Name must be at least 1 character").max(30, "Name must be less than 30 characters"),
  slug: z.string().nullable().transform(nullToEmptyString).refine(isValidSlug, {
    message: "URL can only contain lowercase letters, numbers, and hyphens",
  }),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

type QuestionFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
};

const QuestionField = ({ form, name, label }: QuestionFieldProps) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-col mt-8">
        <FormLabel className="font-semibold text-base mb-3">{label}</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="Type something"
            className="rounded-[8px] border border-[#D7D7D7] h-[58px] placeholder-[#74747A] text-base"
            {...field}
            value={String(field.value)}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

type TextAreaFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
  help?: React.ReactNode;
  className?: string;
  hasDefault?: boolean;
};

const TextAreaField = ({ form, name, label, className, help, hasDefault }: TextAreaFieldProps) => {
  const getDefaultValue = () => {
    switch (name) {
      case "welcomeMessage":
        return DEFAULT_WELCOME_MESSAGE;
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
          <FormLabel className="font-semibold text-base mb-3 flex items-center justify-between">
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
          <FormControl>
            <div className="rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
              <AutosizeTextarea className="pt-1.5" minHeight={80} {...field} value={String(field.value)} />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type CompanyNameFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
};

const CompanyNameField = ({ form, name, label }: CompanyNameFieldProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="font-semibold text-base mb-3">{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              className="rounded-[8px] border border-[#D7D7D7] h-[58px] placeholder-[#74747A] text-base"
              {...field}
              value={String(field.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type URLFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
};

const URLField = ({ form, name, label }: URLFieldProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCopyUrl = () => {
    const url = `${origin}/o/${form.getValues(name)}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col mt-8">
          <FormLabel className="font-semibold text-base mb-3">{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="Enter URL"
              className="rounded-[8px] border border-[#D7D7D7] h-[58px] placeholder-[#74747A] text-base"
              {...field}
              value={String(field.value)}
            />
          </FormControl>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>
              Your chat will be available at: {origin}/o/{field.value || "your-chat-name"}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Copy URL"
            >
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-black" />}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type PublicSwitchFieldProps = {
  name: keyof FormValues;
  label: string;
  form: UseFormReturn<FormValues>;
};

const PublicSwitchField = ({ form, name, label }: PublicSwitchFieldProps) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between mt-8">
        <div className="space-y-0.5">
          <FormLabel className="font-semibold text-base">{label}</FormLabel>
          <p className="text-sm text-muted-foreground">Anyone with the link can chat with your AI assistant</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              className="data-[state=checked]:bg-[#D946EF]"
            />
          </FormControl>
        </div>
      </FormItem>
    )}
  />
);

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
  canUploadLogo?: boolean;
};

export default function GeneralSettings({ tenant, canUploadLogo }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const formattedTenant = useMemo(() => {
    const { welcomeMessage, ...otherFields } = tenant;

    // Zod only uses default values when the value is undefined. They come in as null
    // Change fields you want to have defaults to undefined.
    return {
      welcomeMessage: welcomeMessage ? welcomeMessage : undefined,
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
      // If the slug has changed, check if it's available
      if (values.slug !== tenant.slug) {
        const checkResponse = await fetch("/api/tenants/check-slug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: values.slug,
            tenantId: tenant.id,
          }),
        });

        if (!checkResponse.ok) {
          throw new Error("Failed to check slug availability");
        }

        const { available } = await checkResponse.json();
        if (!available) {
          toast.error("This URL is already taken. Please choose a different one.");
          setLoading(false);
          return;
        }
      }

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
        welcomeMessage: values.welcomeMessage.length ? values.welcomeMessage : undefined,
      });

      // If the slug was changed, redirect to the new URL
      if (values.slug !== tenant.slug) {
        router.push(getSettingsPath(values.slug));
      }
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
        <h1 className="font-bold text-[32px] text-[#343A40]">Settings</h1>
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
          <div className="mb-2 mt-4">
            <Label className="font-semibold text-base text-[#343A40]">Avatar</Label>
          </div>
          <LogoChanger tenant={tenant} />
          <hr className="w-full my-8" />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <CompanyNameField form={form} name="name" label="Company Name" />
            <hr className="w-full my-8" />
            <TextAreaField
              form={form}
              name="welcomeMessage"
              label="Welcome Message"
              help={<HelpWelcomeMessageDialog />}
              className="mt-8 mb-4"
              hasDefault={true}
            />

            <hr className="w-full my-8" />

            <h3 className="font-semibold text-base text-[#343A40]">Example questions to help your users get started</h3>

            <QuestionField form={form} name="question1" label="Question 1" />
            <QuestionField form={form} name="question2" label="Question 2" />
            <QuestionField form={form} name="question3" label="Question 3" />

            <hr className="w-full my-8" />

            <URLField form={form} name="slug" label="URL name" />
            <hr className="w-full my-8" />
            <PublicSwitchField form={form} name="isPublic" label="Enable public chat" />
            <hr className="w-full my-8" />
          </div>
        </form>
      </Form>
    </div>
  );
}
