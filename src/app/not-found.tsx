import Link from "next/link";
import { IconBack } from "@/components/Icons";

export default function NotFound() {
  return (
    <main className="gate">
      <p className="gate-title gate-title--sm">Wrong turn.</p>
      <Link className="pb pb--gold pb--lg" href="/">
        <span className="pb-face">
          <IconBack />
          <span>Back to the gate</span>
        </span>
      </Link>
    </main>
  );
}
