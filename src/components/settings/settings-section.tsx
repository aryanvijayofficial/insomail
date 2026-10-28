import type {ReactNode} from "react";
import {cn} from "@/lib/utils";
export function SettingsSection({title,description,children,className}:{title:string;description?:string;children:ReactNode;className?:string}){
 return <section className={cn("min-w-0 space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6",className)}><header><h2 className="text-lg font-semibold text-neutral-900">{title}</h2>{description&&<p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>}</header>{children}</section>;
}
