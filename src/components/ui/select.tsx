import * as React from "react";
import { fieldContainerClass } from "./design-tokens";
import { cn } from "@/lib/utils";
import type { SelectProps } from "./select-types";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <span className={cn(fieldContainerClass, containerClassName)}>
      <select
        className={cn(
          "flex h-full min-w-0 w-full rounded-[inherit] bg-transparent px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    </span>
  ),
);
Select.displayName = "Select";
