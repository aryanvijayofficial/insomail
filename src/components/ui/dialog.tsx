"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
	className,
	children,
	closeLabel,
	overlayClassName,
	closeClassName,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { closeLabel?: string; overlayClassName?: string; closeClassName?: string }) {
	const { t } = useLanguage();
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className={cn("dialog-overlay fixed inset-0 z-50 bg-black/35", overlayClassName)} />
			<DialogPrimitive.Content
				className={cn(
					"dialog-content fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl",
					className,
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close className={cn("absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-blue-600", closeClassName)}>
					<X className="h-5 w-5" />
					<span className="sr-only">{closeLabel ?? t("navigation.close")}</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("-mx-5 -mt-5 mb-5 space-y-1.5 border-b border-neutral-100 min-h-16 py-4 pl-5 pr-16", className)} {...props} />;
}

export function DialogTitle({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
	return <DialogPrimitive.Title className={cn("text-base font-semibold text-neutral-900", className)} {...props} />;
}

export function DialogDescription({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
	return <DialogPrimitive.Description className={cn("text-xs leading-5 text-neutral-500", className)} {...props} />;
}
