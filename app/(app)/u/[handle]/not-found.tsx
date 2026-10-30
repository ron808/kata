import Link from "next/link";
import { AppPage } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";

/** /u/<handle> where nobody has that handle: said plainly, inside the app. */
export default function ProfileNotFound() {
  return (
    <AppPage width="text">
      <div className="card px-6 py-12 text-center sm:px-10 sm:py-16">
        <span
          aria-hidden
          data-hue="4"
          className="avatar mx-auto h-28 w-28 -rotate-6 text-[3.2rem] shadow-sticker"
        >
          @
        </span>
        <h1 className="mx-auto mt-8 max-w-md font-display text-display-m">No one goes by that handle.</h1>
        <p className="mx-auto mt-4 max-w-sm text-lede text-ink/75">They may have changed it. Try finding them by name.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/people?tab=find" className={buttonClass()}>
            Find people
          </Link>
          <Link href="/people" className={buttonClass({ variant: "secondary" })}>
            Back to People
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
