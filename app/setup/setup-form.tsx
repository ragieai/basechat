"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v3";

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
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setFailureMessage(null);

    try {
      const res = await fetch("/api/setup", { method: "POST", body: JSON.stringify(values) });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const { tenant } = setupSchema.parse(data);
      router.push(getTenantPath(tenant.slug));
    } catch (error) {
      setFailureMessage("An unexpected error occurred. Could not finish setup.");
    } finally {
      setIsLoading(false);
    }
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
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        ></FormField>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#D946EF] font-semibold text-white flex justify-center w-full py-2.5 rounded-[54px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Building..." : "Build my chatbot"}
        </button>
      </form>
    </Form>
  );
}
