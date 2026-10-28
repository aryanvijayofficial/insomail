import { Select } from "@/components/ui/select";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { SelectProps } from "@/components/ui/select-types";
import { cn } from "@/lib/utils";

export const RoutingRuleSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, ...props }, ref) => (
		<span className="relative block min-w-0">
			<Select
				ref={ref}
				className={cn(
					"appearance-none truncate pr-9",
					className,
				)}
				{...props}
			/>
			<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
		</span>
	),
);
RoutingRuleSelect.displayName = "RoutingRuleSelect";
