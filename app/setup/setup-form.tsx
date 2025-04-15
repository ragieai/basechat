"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { setupSchema } from "@/lib/api";
import { getTenantPath } from "@/lib/paths";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export default function SetupForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const router = useRouter();

  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setFailureMessage(null);

    const res = await fetch("/api/setup", { method: "POST", body: JSON.stringify(values) });
    if (res.status < 200 || res.status >= 300) {
      setFailureMessage("An unexpected error occurred. Could not finish setup.");
      return;
    }

    const data = await res.json();
    const { tenant } = setupSchema.parse(data);
    router.push(getTenantPath(tenant.slug));
  }

  return (
    <Form {...form}>
      {failureMessage && <div className="text-destructive mb-8">{failureMessage}</div>}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mb-8 flex flex-col">
              <FormLabel className="mb-4 font-semibold">Company name</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Company name"
                  className="py-2 px-4 rounded border border-[#F5F5F7]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        ></FormField>
        <button
          type="submit"
          className="bg-[#D946EF] font-semibold text-white flex justify-center w-full py-2.5 rounded-[54px]"
        >
          Build my chatbot
        </button>
      </form>
    </Form>
  );
}
