// The motion module. Imported only with import() after hydration, so animation
// never blocks first paint. One curve for everything: CSS uses the same bezier.
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

export const EASE_OUT = CustomEase.create("kata-out", "0.22,1,0.36,1");

/** Only animate what starts below the fold, so nothing visible blinks after hydration. */
export const belowFold = (el: Element) =>
  el.getBoundingClientRect().top >= window.innerHeight;

export { gsap, ScrollTrigger, SplitText };
