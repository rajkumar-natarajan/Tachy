import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg text-fg">
      <div className="text-4xl">⚡</div>
      <div className="text-center">
        <h1 className="text-xl font-bold">404 — Not found</h1>
        <p className="mt-1 text-sm text-muted">
          This page doesn&apos;t exist in Tachy.
        </p>
      </div>
      <Link href="/">
        <Button variant="primary">Back to workspace</Button>
      </Link>
    </div>
  );
}
