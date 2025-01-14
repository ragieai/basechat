"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const PhotoPlaceholderIconSVG = () => (
  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.2001 2.39995H3.80015C3.48189 2.39995 3.17666 2.52638 2.95162 2.75142C2.72657 2.97647 2.60015 3.28169 2.60015 3.59995V14.4L5.77535 11.5752C5.87343 11.4774 6.00229 11.4166 6.14007 11.4031C6.27786 11.3895 6.4161 11.424 6.53135 11.5008L9.72335 13.6284L14.1753 9.17635C14.2643 9.08728 14.3791 9.02846 14.5033 9.00821C14.6276 8.98797 14.7551 9.00733 14.8677 9.06355L19.4001 11.4V3.59995C19.4001 3.28169 19.2737 2.97647 19.0487 2.75142C18.8236 2.52638 18.5184 2.39995 18.2001 2.39995ZM3.80015 1.19995C3.16363 1.19995 2.55318 1.45281 2.10309 1.90289C1.653 2.35298 1.40015 2.96343 1.40015 3.59995V15.6C1.40015 16.2365 1.653 16.8469 2.10309 17.297C2.55318 17.7471 3.16363 18 3.80015 18H18.2001C18.5153 18 18.8274 17.9379 19.1186 17.8173C19.4098 17.6966 19.6743 17.5199 19.8972 17.297C20.1201 17.0741 20.2968 16.8096 20.4175 16.5184C20.5381 16.2272 20.6001 15.9151 20.6001 15.6V3.59995C20.6001 2.96343 20.3473 2.35298 19.8972 1.90289C19.4471 1.45281 18.8367 1.19995 18.2001 1.19995H3.80015ZM8.60015 6.59995C8.60015 6.83633 8.55359 7.07039 8.46313 7.28878C8.37267 7.50717 8.24008 7.7056 8.07294 7.87274C7.90579 8.03989 7.70736 8.17248 7.48898 8.26293C7.27059 8.35339 7.03653 8.39995 6.80015 8.39995C6.56377 8.39995 6.3297 8.35339 6.11132 8.26293C5.89293 8.17248 5.6945 8.03989 5.52735 7.87274C5.36021 7.7056 5.22762 7.50717 5.13716 7.28878C5.0467 7.07039 5.00015 6.83633 5.00015 6.59995C5.00015 6.12256 5.18979 5.66472 5.52735 5.32716C5.86492 4.98959 6.32276 4.79995 6.80015 4.79995C7.27754 4.79995 7.73537 4.98959 8.07294 5.32716C8.4105 5.66472 8.60015 6.12256 8.60015 6.59995Z"
      fill="#86868B"
    />
  </svg>
);

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export default function SetupForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const { update } = useSession();

  const router = useRouter();

  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setFailureMessage(null);

    const setupResponse = await fetch("/api/setup", { method: "POST", body: JSON.stringify(values) });
    if (setupResponse.status < 200 || setupResponse.status >= 300) {
      setFailureMessage("An unexpected error occurred. Could not finish setup.");
      return;
    }

    await router.push("/");
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
          className="bg-[#D946EF] fond-semibold text-white flex justify-center w-full py-2.5 rounded-[54px]"
        >
          Build my chatbot
        </button>
      </form>
    </Form>
  );
}
