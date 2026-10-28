import * as React from "react";
import { fieldClass } from "./design-tokens";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, readOnly, ...props }, ref) => (
		<input
			type={type}
            readOnly={readOnly}
            title={readOnly ? "Read only" : props.title}
			className={cn(
				className?.split(/\s+/).includes("sr-only") ? undefined : "block",
                className?.split(/\s+/).includes("sr-only") ? undefined : fieldClass,
                readOnly && "cursor-default border-dashed text-neutral-600",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Input.displayName = "Input";
