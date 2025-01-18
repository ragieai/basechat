import SignIn from "./sign-in";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <div className="self-start mb-12 text-[30px] font-bold">
        Welcome back.
        <br />
        Log in to your account below.
      </div>
      <SignIn className="w-full" redirectTo={params.redirectTo} />
    </>
  );
}
