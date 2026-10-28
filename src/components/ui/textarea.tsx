import * as React from "react";
import { fieldClass } from "./design-tokens";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
	({ className, ...props }, ref) => (
		<textarea
			className={cn(
				fieldClass, "min-h-24 h-auto resize-y",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Textarea.displayName = "Textarea";
