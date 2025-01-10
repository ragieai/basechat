"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as schema from "@/lib/db/schema";

const formSchema = z.object({
  question1: z.string(),
  question2: z.string(),
  question3: z.string(),
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

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
};

export default function GeneralSettings({ tenant }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { question1: "", question2: "", question3: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log({ values });
  }

  async function handleCancel() {
    form.reset();
  }

  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full justify-between items-center pt-2">
            <h1 className="font-bold text-[32px]">Settings</h1>
          </div>
          <div className="mt-16">
            <h3 className="font-semibold text-[16px]">Add sample questions to help your users get started</h3>

            <QuestionField form={form} name="question1" label="Question 1" />
            <QuestionField form={form} name="question2" label="Question 2" />
            <QuestionField form={form} name="question3" label="Question 3" />

            <div className="flex mt-8 justify-end">
              <button
                type="reset"
                className="rounded-lg disabled:opacity-[55%] px-4 py-2.5 mr-3"
                disabled={!form.formState.isDirty}
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-[#D946EF] text-white disabled:opacity-[55%] px-4 py-2.5"
                disabled={!form.formState.isDirty}
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
