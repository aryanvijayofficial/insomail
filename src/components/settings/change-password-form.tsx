"use client";
import { useState } from "react";
import { Eye, EyeOff, Check, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "./utils";

export function ChangePasswordForm() {
 const { t } = useLanguage();
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [visible, setVisible] = useState<Record<string,boolean>>({});
 const [status, setStatus] = useState<string | null>(null);
 const [success, setSuccess] = useState(false);
 const [loading, setLoading] = useState(false);
 const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
 const valid = !!currentPassword && newPassword.length >= 8 && confirmPassword === newPassword;
 async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); setStatus(null); setSuccess(false);
  if(newPassword !== confirmPassword) {setStatus(t("settings.password.mismatch"));return;}
  setLoading(true);
  try {await updatePassword(currentPassword,newPassword);setCurrentPassword("");setNewPassword("");setConfirmPassword("");setSuccess(true);setStatus(t("settings.password.changed"));}
  catch(err) {setStatus(err instanceof Error ? err.message : t("settings.password.failed"));}
  finally {setLoading(false);}
 }
 const fields = [
  {id:"currentPassword",label:t("settings.password.current"),value:currentPassword,set:setCurrentPassword,auto:"current-password",placeholder:"Enter your current password"},
  {id:"newPassword",label:t("settings.password.new"),value:newPassword,set:setNewPassword,auto:"new-password",placeholder:"At least 8 characters"},
  {id:"confirmPassword",label:t("settings.password.confirm"),value:confirmPassword,set:setConfirmPassword,auto:"new-password",placeholder:"Re-enter your new password"},
 ];
 return <form onSubmit={onSubmit} className="max-w-lg space-y-5" aria-busy={loading}>
  {fields.map(field=><div key={field.id} className="space-y-2"><Label htmlFor={field.id} className="text-sm font-medium text-neutral-800">{field.label}</Label><div className="relative"><Input id={field.id} type={visible[field.id]?"text":"password"} autoComplete={field.auto} value={field.value} onChange={e=>{field.set(e.target.value);if(status)setStatus(null);}} required minLength={field.id==="currentPassword"?undefined:8} placeholder={field.placeholder} disabled={loading} aria-invalid={field.id==="confirmPassword"&&mismatch} aria-describedby={field.id==="newPassword"?"password-requirements":field.id==="confirmPassword"?"password-match":undefined} className="h-12 rounded-xl border-neutral-300 bg-neutral-50 pr-12 shadow-none focus-visible:ring-2 focus-visible:ring-blue-600/20"/><button type="button" onClick={()=>setVisible(v=>({...v,[field.id]:!v[field.id]}))} aria-label={`${visible[field.id]?"Hide":"Show"} ${field.label.toLowerCase()}`} aria-pressed={!!visible[field.id]} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-neutral-500 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-blue-600">{visible[field.id]?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{field.id==="newPassword"&&<p id="password-requirements" className={`flex items-center gap-1.5 text-xs ${newPassword.length>=8?"text-green-700":"text-neutral-500"}`}><Check size={13} aria-hidden="true"/>At least 8 characters</p>}{field.id==="confirmPassword"&&<p id="password-match" className={`min-h-4 text-xs ${mismatch?"text-red-600":"text-green-700"}`} aria-live="polite">{confirmPassword ? mismatch?t("settings.password.mismatch"):"Passwords match":" "}</p>}</div>)}
  <div className="border-t border-neutral-200 pt-5"><Button type="submit" disabled={loading||!valid} className="min-h-11 w-full rounded-xl sm:w-auto"><LockKeyhole size={16}/>{loading?t("settings.password.changing"):t("settings.password.change")}</Button><p role={success?"status":"alert"} className={`mt-3 min-h-5 text-sm ${success?"text-green-700":"text-red-600"}`}>{status}</p></div>
 </form>;
}
