import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const attempts=new Map<string,{count:number;reset:number}>();
const genericError="Taarifa za kuingia si sahihi.";
function phone(value:string){const digits=value.replace(/\D/g,"");const national=digits.startsWith("255")?digits.slice(3):digits.startsWith("0")?digits.slice(1):digits;return /^[67]\d{8}$/.test(national)?`255${national}`:"";}
function username(value:string){const normalized=value.trim().toLowerCase();return /^[a-z0-9][a-z0-9._-]{3,29}$/.test(normalized)?normalized:"";}
function response(body:Record<string,unknown>,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store, max-age=0"}});}

export async function POST(request:Request){
  let body:{identity?:string;password?:string};try{body=await request.json();}catch{return response({error:genericError},400);}
  const raw=body.identity?.trim()??"",password=body.password??"";
  const kind=raw.includes("@")?"email":phone(raw)?"phone":"username";
  const normalized=kind==="email"?raw.toLowerCase():kind==="phone"?phone(raw):username(raw);
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const key=createHash("sha256").update(`${ip}:${normalized}`).digest("hex"),now=Date.now(),entry=attempts.get(key);
  if(entry&&entry.reset>now&&entry.count>=8)return response({error:genericError},429);
  attempts.set(key,{count:entry&&entry.reset>now?entry.count+1:1,reset:now+15*60_000});
  if(!normalized||!password)return response({error:genericError},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,keySecret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!keySecret)return response({error:genericError},500);
  const admin=createAdminClient(url,keySecret,{auth:{persistSession:false,autoRefreshToken:false}});
  let internalEmail:string|null=null;
  const column=kind==="email"?"normalized_real_email":kind==="phone"?"normalized_phone":"normalized_username";
  const {data:alias}=await admin.from("user_login_identities").select("internal_auth_email,user_id").eq(column,normalized).maybeSingle();
  if(alias)internalEmail=alias.internal_auth_email;
  else if(kind==="email")internalEmail=normalized;
  if(!internalEmail)return response({error:genericError},401);
  const supabase=await createClient();const {data,error}=await supabase.auth.signInWithPassword({email:internalEmail,password});
  if(error||!data.user)return response({error:genericError},401);
  const {data:profile,error:profileError}=await admin.from("profiles").select("role,is_active,force_password_change").eq("id",data.user.id).maybeSingle();
  if(profileError||!profile){await supabase.auth.signOut();return response({error:genericError},500);}
  if(!profile?.is_active){await supabase.auth.signOut();return response({error:genericError},401);}
  const mustChangePassword=profile.force_password_change===true;
  const redirectTo=mustChangePassword?"/change-password":profile.role==="scanner"?"/check-in":"/dashboard";
  attempts.delete(key);return response({success:true,mustChangePassword,redirectTo});
}
