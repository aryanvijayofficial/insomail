"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { fieldClass } from "./design-tokens";
import { cn } from "@/lib/utils";
import type { SelectProps } from "./select-types";

type Option = { value: string; label: React.ReactNode; disabled?: boolean; lang?: string };
function optionsFrom(children: React.ReactNode): Option[] {
  return React.Children.toArray(children).flatMap((child): Option[] => {
    if (!React.isValidElement<{value?: string | number; children?: React.ReactNode; disabled?: boolean; lang?: string}>(child)) return [];
    if (child.type === "option") return [{value: String(child.props.value ?? child.props.children ?? ""), label: child.props.children, disabled: child.props.disabled, lang: child.props.lang}];
    return optionsFrom(child.props.children);
  });
}
const EMPTY = "__insomail_empty_option__";
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, containerClassName, children, value, defaultValue, onChange, disabled, id, name, required, form, ...props }, forwardedRef,
) {
  const options = optionsFrom(children);
  const [internal, setInternal] = React.useState(String(defaultValue ?? options[0]?.value ?? ""));
  const selected = String(value ?? internal);
  const nativeRef = React.useRef<HTMLSelectElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    const formElement=nativeRef.current?.form;
    const reset=()=>setInternal(String(defaultValue ?? options[0]?.value ?? ""));
    formElement?.addEventListener("reset",reset);
    return()=>formElement?.removeEventListener("reset",reset);
  },[defaultValue,options[0]?.value]);
  return <span className={cn("relative inline-flex min-w-0 w-full", containerClassName)}>
    <select {...props} onInvalid={event=>{event.preventDefault();triggerRef.current?.focus();triggerRef.current?.setAttribute("aria-invalid","true");props.onInvalid?.(event);}} ref={(node) => { nativeRef.current = node; if (typeof forwardedRef === "function") forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }} value={selected} onChange={onChange} disabled={disabled} name={name} required={required} form={form} aria-hidden="true" tabIndex={-1} className="sr-only pointer-events-none" style={{position:"absolute",width:1,height:1,opacity:0}}>{children}</select>
    <Primitive.Root value={selected === "" ? EMPTY : selected} disabled={disabled} onValueChange={(next) => {
      const actual = next === EMPTY ? "" : next;
      setInternal(actual);
      triggerRef.current?.removeAttribute("aria-invalid");
      const native = nativeRef.current;
      if (native) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(native, actual);
        onChange?.({target:native,currentTarget:native,type:"change",preventDefault(){},stopPropagation(){}} as React.ChangeEvent<HTMLSelectElement>);
      }
    }}>
      <Primitive.Trigger ref={triggerRef} id={id} aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"]} className={cn(fieldClass,"relative inline-flex min-w-0 items-center text-left",className,"pr-10")}>
        <span className="min-w-0 flex-1 truncate"><Primitive.Value /></span>
        <Primitive.Icon asChild><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" /></Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal><Primitive.Content position="popper" sideOffset={6} className="z-[150] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 text-sm text-neutral-900 shadow-xl">
        <Primitive.ScrollUpButton className="flex h-6 items-center justify-center"><ChevronUp className="h-4 w-4" /></Primitive.ScrollUpButton>
        <Primitive.Viewport>{options.map((option) => <Primitive.Item key={option.value} value={option.value === "" ? EMPTY : option.value} disabled={option.disabled} lang={option.lang} className="relative flex min-h-9 cursor-default items-center rounded-lg py-2 pl-3 pr-9 outline-none data-[highlighted]:bg-neutral-100 data-[disabled]:opacity-50"><Primitive.ItemText>{option.label}</Primitive.ItemText><Primitive.ItemIndicator className="absolute right-3"><Check className="h-4 w-4" /></Primitive.ItemIndicator></Primitive.Item>)}</Primitive.Viewport>
        <Primitive.ScrollDownButton className="flex h-6 items-center justify-center"><ChevronDown className="h-4 w-4" /></Primitive.ScrollDownButton>
      </Primitive.Content></Primitive.Portal>
    </Primitive.Root>
  </span>;
});
