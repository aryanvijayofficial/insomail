// Signature-only allowlist, shared by server saves and the visual editor.
import { parseFragment, serialize, type DefaultTreeAdapterTypes as Tree } from "parse5";
const tags=new Set(['p','div','br','span','b','strong','i','em','u','s','ul','ol','li','a','img','table','tbody','thead','tfoot','tr','td','th','hr']);
const drop=new Set(['script','style','iframe','object','embed','svg','math','form','input','button','template','link','meta']);
export function signatureUrl(value:string,image=false):string|null {
 try {const url=new URL(value.trim());return (image?url.protocol==='https:':['https:','http:','mailto:','tel:'].includes(url.protocol))?url.href:null;}catch{return null;}
}
export function sanitizeSignatureHtml(source:string):string {
 const root=parseFragment(source);
 function clean(parent:Tree.ParentNode){
  const children:Tree.ChildNode[]=[];
  for(const node of parent.childNodes){
   if(node.nodeName==='#text'){children.push(node);continue;}
   if(!('tagName'in node)||drop.has(node.tagName))continue;
   clean(node);
   if(!tags.has(node.tagName)){for(const child of node.childNodes){child.parentNode=parent;children.push(child);}continue;}
   node.attrs=node.attrs.flatMap(({name,value})=>{
    if(name==='href'&&node.tagName==='a'){const v=signatureUrl(value);return v?[{name,value:v}]:[];}
    if(name==='src'&&node.tagName==='img'){const v=signatureUrl(value,true);return v?[{name,value:v}]:[];}
    if(name==='alt'&&node.tagName==='img')return[{name,value:value.slice(0,200)}];
    if(['width','height','colspan','rowspan','cellpadding','cellspacing','border'].includes(name)&&/^\d{1,3}$/.test(value))return[{name,value}];
    if(name==='style'){
     const safe=value.split(';').flatMap(s=>{const i=s.indexOf(':');const k=s.slice(0,i).trim().toLowerCase(),v=s.slice(i+1).trim();
      if(['color','background-color'].includes(k)&&/^(#[a-f\d]{3,8}|[a-z]{1,20}|rgba?\([\d.,%\s]+\))$/i.test(v))return[`${k}:${v}`];
      if(['font-weight','font-style','text-decoration','text-align','vertical-align','border-collapse'].includes(k)&&/^[a-z0-9 -]{1,30}$/i.test(v))return[`${k}:${v}`];
      if(['width','height','padding','margin','font-size','border-width'].includes(k)&&/^(\d{1,3}(px|pt|em|%)?\s*){1,4}$/.test(v))return[`${k}:${v}`];
      if(k==='border'&&/^\d{1,2}px solid (#[a-f\d]{3,8}|[a-z]+)$/i.test(v))return[`${k}:${v}`];return[];
     }).join(';');return safe?[{name,value:safe}]:[];
    }return[];
   });
   if(node.tagName==='img'&&!node.attrs.some(a=>a.name==='src'))continue;
   if(node.tagName==='a')node.attrs.push({name:'target',value:'_blank'},{name:'rel',value:'noopener noreferrer'});
   if(node.tagName==='img')node.attrs.push({name:'referrerpolicy',value:'no-referrer'});
   children.push(node);
  }parent.childNodes=children;
 }clean(root);return serialize(root);
}
