// Demo-only stand-in for next/link (the demo is a single page).
import type { AnchorHTMLAttributes } from "react";
export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...rest} />;
}
