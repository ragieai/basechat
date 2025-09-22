"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { updateTenantSchema } from "@/lib/api";
import {
  LLM_DISPLAY_NAMES,
  LLM_LOGO_MAP,
  LLMModel,
  modelArraySchema,
  getEnabledModelsFromDisabled,
  modelSchema,
  NON_AGENTIC_MODELS,
} from "@/lib/llm/types";
import * as schema from "@/lib/server/db/schema";

const formSchema = z.object({
  disabledModels: modelArraySchema,
  defaultModel: modelSchema,
  isBreadth: z.boolean().default(false),
  overrideBreadth: z.boolean().default(true),
  rerankEnabled: z.boolean().default(false),
  overrideRerank: z.boolean().default(true),
  prioritizeRecent: z.boolean().default(false),
  overridePrioritizeRecent: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const ModelsField = (form: UseFormReturn<FormValues>) => {
  const handleToggleModel = (model: LLMModel, isEnabled: boolean) => {
    const currentDisabledModels = form.getValues("disabledModels") || [];
    const currentEnabledModels = getEnabledModelsFromDisabled(currentDisabledModels);

    if (isEnabled && !currentEnabledModels.includes(model)) {
      // Enable model by removing it from disabled list
      const newDisabledModels = currentDisabledModels.filter((m) => m !== model);
      form.setValue("disabledModels", newDisabledModels, {
        shouldDirty: true,
        shouldValidate: true,
      });

      // If this is now the only enabled model, set it as default
      const newEnabledModels = getEnabledModelsFromDisabled(newDisabledModels);
      if (newEnabledModels.length === 1) {
        form.setValue("defaultModel", model, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } else if (!isEnabled && currentEnabledModels.includes(model)) {
      // Disable model by adding it to disabled list
      const newDisabledModels = [...currentDisabledModels, model];
      form.setValue("disabledModels", newDisabledModels, {
        shouldDirty: true,
        shouldValidate: true,
      });

      // If we're disabling the current default model and there are other models available,
      // set the first remaining enabled model as default
      if (model === form.getValues("defaultModel")) {
        const remainingEnabledModels = getEnabledModelsFromDisabled(newDisabledModels);
        if (remainingEnabledModels.length > 0) {
          form.setValue("defaultModel", remainingEnabledModels[0], {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    }
  };

  const handleSetDefault = (model: LLMModel) => {
    form.setValue("defaultModel", model, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <FormField
      control={form.control}
      name="disabledModels"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <div className="mb-5">
            <FormLabel className="font-semibold text-base text-[#343A40]">Models</FormLabel>
            <p className="text-sm text-muted-foreground">Choose which models can be used by this chatbot</p>
          </div>
          <div className="space-y-5 pl-8">
            {NON_AGENTIC_MODELS.map((model) => {
              const isEnabled = !field.value?.includes(model);
              const isDefault = model === form.getValues("defaultModel");
              const [_, logoPath] = LLM_LOGO_MAP[model as string];
              return (
                <div key={model} className="group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image
                        src={logoPath}
                        alt={LLM_DISPLAY_NAMES[model as string]}
                        width={20}
                        height={20}
                        className="mr-2"
                      />
                      <div className="text-base">{LLM_DISPLAY_NAMES[model as string]}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-right">
                        {isDefault ? (
                          <span className="text-[13px] line-height-[20px] text-black bg-muted px-2 py-1 gap-2 rounded">
                            Default
                          </span>
                        ) : (
                          isEnabled && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(model)}
                              className="text-sm text-[#7749F8] hover:text-[#7749F8]/80 hidden group-hover:block"
                            >
                              Set as default
                            </button>
                          )
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleModel(model, checked)}
                        className="data-[state=checked]:bg-[#7749F8]"
                      />
                    </div>
                  </div>
                  <hr className="w-full my-4" />
                </div>
              );
            })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const SearchSettingsField = (form: UseFormReturn<FormValues>) => {
  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <div>
          <FormLabel className="font-semibold text-base">Additional Options</FormLabel>
        </div>

        {/* Breadth/Depth Setting */}
        <FormField
          control={form.control}
          name="isBreadth"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    const newValue = value === "breadth";
                    field.onChange(newValue);
                  }}
                  value={field.value ? "breadth" : "depth"}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="breadth"
                        id="breadth"
                        className="text-[#D946EF] border-[#D7D7D7] data-[state=checked]:bg-[#D946EF]"
                      />
                      <label htmlFor="breadth" className="text-sm">
                        Breadth Mode
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
                        Depth Mode
                      </label>
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">
                      Retrieves results from a smaller range of documents for more depth (faster)
                    </span>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="overrideBreadth"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Allow users to change default setting</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <hr className="w-full my-1" />

        {/* Rerank Setting */}
        <FormField
          control={form.control}
          name="rerankEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="font-semibold text-base">Rerank</FormLabel>
                <p className="text-sm text-muted-foreground">Reorder search results for better relevance</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#D946EF]"
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="overrideRerank"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Allow users to change default setting</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <hr className="w-full my-1" />

        {/* Prioritize Recent Setting */}
        <FormField
          control={form.control}
          name="prioritizeRecent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="font-semibold text-base">Prioritize recent data</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Give preference to more recent documents in search results
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#D946EF]"
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="overridePrioritizeRecent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pb-8">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Allow users to change default setting</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
};

export default function ModelSettings({ tenant }: Props) {
  const [isLoading, setLoading] = useState(false);

  const formattedTenant = useMemo(() => {
    const {
      disabledModels,
      defaultModel,
      isBreadth,
      overrideBreadth,
      rerankEnabled,
      overrideRerank,
      prioritizeRecent,
      overridePrioritizeRecent,
      ...otherFields
    } = tenant;

    // Zod only uses default values when the value is undefined. They come in as null
    // Change fields you want to have defaults to undefined.
    return {
      disabledModels: disabledModels,
      defaultModel: defaultModel ?? undefined,
      isBreadth: isBreadth ?? undefined,
      overrideBreadth: overrideBreadth ?? undefined,
      rerankEnabled: rerankEnabled ?? undefined,
      overrideRerank: overrideRerank ?? undefined,
      prioritizeRecent: prioritizeRecent ?? undefined,
      overridePrioritizeRecent: overridePrioritizeRecent ?? undefined,
      ...otherFields,
    };
  }, [tenant]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formSchema.parse(formattedTenant),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);

    try {
      // Validate that at least one model is enabled
      const enabledModels = getEnabledModelsFromDisabled(values.disabledModels);
      if (enabledModels.length === 0) {
        toast.error("Please enable at least one model before saving.");
        setLoading(false);
        return;
      }

      const payload = updateTenantSchema.parse({
        disabledModels: values.disabledModels,
        defaultModel: values.defaultModel,
        isBreadth: values.isBreadth,
        overrideBreadth: values.overrideBreadth,
        rerankEnabled: values.rerankEnabled,
        overrideRerank: values.overrideRerank,
        prioritizeRecent: values.prioritizeRecent,
        overridePrioritizeRecent: values.overridePrioritizeRecent,
      });

      const res = await fetch("/api/tenants/current", {
        method: "PATCH",
        headers: { tenant: tenant.slug },
        body: JSON.stringify(payload),
      });

      if (res.status !== 200) throw new Error("Failed to save settings");

      toast.success("Changes saved");
      form.reset(values);
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    form.reset(formattedTenant);
  }

  return (
    <div className="w-full p-4 flex-grow flex flex-col relative">
      <div className="flex w-full justify-between items-center mb-12">
        <h1 className="font-bold text-[32px] text-[#343A40]">Models</h1>
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
            onClick={() => onSubmit(form.getValues())}
          >
            Save
            {isLoading && <Loader2 size={18} className="ml-2 animate-spin" />}
          </button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          <div>{ModelsField(form)}</div>
          <div className="h-16" />
          {SearchSettingsField(form)}
        </form>
      </Form>
    </div>
  );
}
