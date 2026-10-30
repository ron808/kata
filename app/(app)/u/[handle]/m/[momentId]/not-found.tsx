import Link from "next/link";
import { AppPage } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";

/** A moment that's gone, or one the viewer may not see: the two look the same from outside. */
export default function MomentNotFound() {
  return (
    <AppPage width="text">
      <div className="card px-6 py-12 text-center sm:px-10 sm:py-16">
        <span aria-hidden data-hue="2" className="avatar mx-auto h-28 w-28 rotate-3 shadow-sticker">
          <Icon name="chat" className="h-12 w-12" strokeWidth={1.8} />
        </span>
        <h1 className="mx-auto mt-8 max-w-md font-display text-display-m">This moment isn’t here.</h1>
        <p className="mx-auto mt-4 max-w-sm text-lede text-ink/75">It may have been deleted, or it’s only for the author’s friends.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/people" className={buttonClass()}>
            Back to People
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
