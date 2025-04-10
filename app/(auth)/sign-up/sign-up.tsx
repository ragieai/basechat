"use client";

import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { z } from "zod";

import { signUp } from "@/lib/auth-client";
import { getStartPath } from "@/lib/paths";

import { Button, Error } from "../common";
import { extendPasswordSchema } from "../utils";

const registerSchema = extendPasswordSchema({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  email: z.string().email().trim().min(1, { message: "Email is required" }),
});

const initialState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirm: "",
  error: undefined,
};

export default function SignUp({ redirectTo }: { redirectTo?: string }) {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "setError":
        return { ...state, error: action.error };
      default:
        return { ...state, ...action, error: undefined };
    }
  }, initialState);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error, data } = registerSchema.safeParse(state);
    if (error) {
      dispatch({ type: "setError", error: error.errors.map((error) => error.message) });
      return;
    }

    const callbackURL = redirectTo || getStartPath();

    await signUp.email({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: data.password,
      callbackURL,
      fetchOptions: {
        onError: (error) => {
          dispatch({ type: "setError", error: [error.error.message] });
        },
        onSuccess: () => {
          router.push(callbackURL);
        },
      },
    });
  };

  return (
    <form className="flex flex-col w-full" onSubmit={handleSubmit}>
      <Error error={state.error} />

      <div className="flex justify-between gap-4">
        <input
          name="firstName"
          type="text"
          placeholder="First name"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
          onChange={(e) => dispatch({ firstName: e.target.value })}
        />
        <input
          name="lastName"
          type="text"
          placeholder="Last name"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
          onChange={(e) => dispatch({ lastName: e.target.value })}
        />
      </div>
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
        onChange={(e) => dispatch({ email: e.target.value })}
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
        onChange={(e) => dispatch({ password: e.target.value })}
      />
      <input
        name="confirm"
        type="password"
        placeholder="Confirm password"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-8"
        onChange={(e) => dispatch({ confirm: e.target.value })}
      />
      <Button>Sign up</Button>
    </form>
  );
}
