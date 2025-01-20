import { Roboto } from "next/font/google";
import Image from "next/image";

import GoogleMarkSVG from "../../../public/google-mark.svg";

import { handleGoogleSignIn } from "./actions";

interface Props {
  redirectTo?: string;
}

const roboto = Roboto({ subsets: ["latin"], weight: "400" });

export default function GoogleSignIn({ redirectTo }: Props) {
  return (
    <form className="mb-8 w-full" action={handleGoogleSignIn}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className="flex bg-[#F2F2F2] py-2.5 px-3 rounded-[48px] w-full justify-center items-center">
        <Image src={GoogleMarkSVG} alt="Continue with Google" />
        <div className={`ml-2.5 text-md drop-shadow-md ${roboto.className}`}>Continue with Google</div>
      </button>
    </form>
  );
}
