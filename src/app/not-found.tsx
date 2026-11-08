import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 40, margin: "0 0 16px" }}>Wrong turn.</p>
        <Link href="/">Back to the gate</Link>
      </div>
    </main>
  );
}
