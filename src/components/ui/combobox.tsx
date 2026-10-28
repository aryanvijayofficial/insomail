"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "./input";
import { fieldClass } from "./design-tokens";
import { useLanguage } from "@/components/language-provider";

type Option = { value: string; label: string };
export function Combobox({id,value,onChange,options,placeholder,searchLabel,disabled=false}:{id:string;value:string;onChange(value:string):void;options:(string|Option)[];placeholder?:string;searchLabel:string;disabled?:boolean}) {
  const {t}=useLanguage();
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [active,setActive]=useState(-1);
  const popup=useRef<HTMLDivElement>(null);
  const search=useRef<HTMLInputElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const [position,setPosition]=useState({left:0,top:0,width:0,height:300});
  const root=useRef<HTMLDivElement>(null);
  const listId=useId();
  const entries=options.map(option=>typeof option==="string"?{value:option,label:option}:option);
  const normalized=query.replaceAll("_"," ").trim().toLowerCase();
  const shown=entries.filter(option=>`${option.label} ${option.value}`.replaceAll("_"," ").toLowerCase().includes(normalized));
  function close(restore=false){setOpen(false);if(restore)trigger.current?.focus();}
  function choose(option:Option){onChange(option.value);close(true);}
  useEffect(()=>{const closeOutside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);};document.addEventListener("pointerdown",closeOutside);return()=>document.removeEventListener("pointerdown",closeOutside);},[]);
  useEffect(()=>{
    if(!open)return;
    setQuery("");setActive(-1);
    const place=()=>{const r=root.current?.getBoundingClientRect();if(!r)return;const below=window.innerHeight-r.bottom-12,above=r.top-12;const up=below<220&&above>below;const height=Math.min(320,Math.max(100,up?above:below));setPosition({left:Math.max(8,Math.min(r.left,innerWidth-r.width-8)),top:up?r.top-height-6:r.bottom+6,width:Math.min(r.width,innerWidth-16),height});};
    place();search.current?.focus();
    window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
    return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
  },[open]);
  useEffect(()=>{popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:"nearest"});},[active]);
  return <div className="relative" ref={root}>
    <button ref={trigger} id={id} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} className={`${fieldClass} relative flex w-full min-w-0 items-center pr-10 text-left`} onClick={()=>setOpen(!open)} onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);}}}>
      <span className="min-w-0 flex-1 truncate">{entries.find(option=>option.value===value)?.label??placeholder??value}</span><ChevronDown aria-hidden="true" className="absolute right-3 h-4 w-4 text-neutral-500" />
    </button>
    {open&&createPortal(<div ref={popup} style={{position:"fixed",left:position.left,top:position.top,width:position.width,maxHeight:position.height}} className="z-[150] flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 shadow-xl" onBlur={event=>{if(!popup.current?.contains(event.relatedTarget as Node)&&!root.current?.contains(event.relatedTarget as Node))close();}} onKeyDown={event=>{
      if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close(true);}
      if(event.key==="Tab"){close();}
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setActive(current=>Math.max(0,Math.min(shown.length-1,current+(event.key==="ArrowDown"?1:-1))));}
      if(event.key==="Enter"){event.preventDefault();if(active>=0&&shown[active])choose(shown[active]);}
    }}>
      <div className="relative shrink-0 border-b border-neutral-200 p-2"><Search aria-hidden="true" className="pointer-events-none absolute left-5 top-5 h-4 w-4 text-neutral-500" /><Input ref={search} role="combobox" aria-label={searchLabel} aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={active>=0&&active<shown.length?`${listId}-${active}`:undefined} value={query} placeholder={searchLabel} autoComplete="off" className="pl-9" onChange={event=>{setQuery(event.target.value);setActive(-1);}} /></div>
      <div id={listId} role="listbox" className="min-h-0 overflow-y-auto overscroll-contain p-1">
        {shown.length===0&&<p className="px-3 py-2 text-neutral-500" role="status">{t("common.none")}</p>}
        {shown.map((option,index)=><div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={option.value===value} data-active={index===active} onPointerMove={()=>setActive(index)} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(option)} className={`flex min-h-9 cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 ${index===active?"bg-neutral-100":""}`}><span className="min-w-0 break-words">{option.label}</span>{option.value===value&&<Check aria-hidden="true" className="h-4 w-4 shrink-0" />}</div>)}
      </div>
    </div>,document.body)}
  </div>;
}
