"use client";

import { Button, EmptyState } from "@/components/ui";
import { Zap } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg text-fg">
      <EmptyState
        icon={<Zap size={36} />}
        title="This view crashed"
        description="An error occurred while rendering. Your local data is safe."
        action={
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
