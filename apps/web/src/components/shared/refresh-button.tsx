"use client";

import type { ComponentProps } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Keep the original handler, disabled state and ref (dialog focus return).
export function RefreshButton({
  label,
  busy = false,
  className = "",
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  label: string;
  busy?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      {...props}
      className={`refresh-button ${className}`}
      aria-label={label}
      title={busy ? `${label}，正在刷新` : label}
      aria-busy={busy}
    >
      <RefreshCw
        aria-hidden="true"
        className={busy ? "refresh-spinning" : ""}
      />
    </Button>
  );
}
