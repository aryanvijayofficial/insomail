"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "./input";
import { useLanguage } from "@/components/language-provider";

export function Combobox({id,value,onChange,options,placeholder,disabled=false}:{id:string;value:string;onChange(value:string):void;options:string[];placeholder?:string;disabled?:boolean}) {
  const {t}=useLanguage();
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(-1);
  const popup=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:256});
  const root=useRef<HTMLDivElement>(null);
  const listId=useId();
  const shown=options.filter(option=>option.replaceAll("_"," ").toLowerCase().includes(value.replaceAll("_"," ").toLowerCase()));
  useEffect(()=>{const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[]);
  useEffect(()=>{if(!open)return;const place=()=>{const r=root.current?.getBoundingClientRect();if(!r)return;const below=window.innerHeight-r.bottom-12,above=r.top-12;const up=below<160&&above>below;const height=Math.min(256,Math.max(80,up?above:below));setPosition({left:r.left,top:up?r.top-height-6:r.bottom+6,width:r.width,maxHeight:height});};place();window.addEventListener("resize",place);window.addEventListener("scroll",place,true);return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};},[open]);
  useEffect(()=>{popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:"nearest"});},[active]);
  return <div className="relative" ref={root}>
    <Input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open&&active>=0&&active<shown.length?`${listId}-${active}`:undefined} value={value} placeholder={placeholder} disabled={disabled} autoComplete="off" className="pr-10" onFocus={()=>setOpen(true)} onBlur={event=>{if(!root.current?.contains(event.relatedTarget as Node)&&!popup.current?.contains(event.relatedTarget as Node))setOpen(false);}} onChange={event=>{onChange(event.target.value);setActive(-1);setOpen(true);}} onKeyDown={event=>{
      if(event.key==="Escape"){setOpen(false);return;}
      if(event.key==="Tab"){setOpen(false);return;}
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);setActive(current=>Math.max(0,Math.min(shown.length-1,current+(event.key==="ArrowDown"?1:-1))));}
      if(event.key==="Enter"&&open&&active>=0&&shown[active]){event.preventDefault();onChange(shown[active]);setOpen(false);}
    }}/>
    <button type="button" tabIndex={-1} disabled={disabled} aria-label={placeholder} className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-neutral-500" onClick={()=>{root.current?.querySelector("input")?.focus();setOpen(!open);}}><ChevronDown aria-hidden="true" className="h-4 w-4" /></button>
    {open&&createPortal(<div ref={popup} style={{position:"fixed",...position}} id={listId} role="listbox" className="z-[150] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 text-sm text-neutral-900 shadow-xl">
      {shown.length===0&&<p className="px-3 py-2 text-neutral-500" role="status">{t("common.none")}</p>}
      {shown.map((option,index)=><div key={option} id={`${listId}-${index}`} role="option" aria-selected={option===value} data-active={index===active} onPointerMove={()=>setActive(index)} onPointerDown={event=>event.preventDefault()} onClick={()=>{onChange(option);setOpen(false);}} className={`flex min-h-9 cursor-default items-center justify-between rounded-lg px-3 py-2 ${index===active?"bg-neutral-100":""}`}>{option}{option===value&&<Check aria-hidden="true" className="h-4 w-4" />}</div>)}
    </div>,document.body)}
  </div>;
}
