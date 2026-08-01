import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const headers={"Cache-Control":"no-store, max-age=0","Content-Type":"application/json"};
const json=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers});
function bearer(request:Request){const value=request.headers.get("authorization");return value?.startsWith("Bearer ")?value.slice(7).trim():"";}

export async function DELETE(request:Request,{params}:{params:Promise<{userId:string}>}){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key||!anon)return json({success:false,error:"delete-failed"},500);
    const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),token=bearer(request);const {data:{user:requester}}=await admin.auth.getUser(token);if(!requester)return json({success:false,error:"not-authorized"},401);
    const {data:requesterProfile}=await admin.from("profiles").select("role,is_active").eq("id",requester.id).maybeSingle();if(requesterProfile?.role!=="admin"||!requesterProfile.is_active)return json({success:false,error:"not-authorized"},403);
    const {userId}=await params;if(userId===requester.id)return json({success:false,error:"cannot-delete-current-user"},400);
    let body:{confirmation?:string;adminPassword?:string};try{body=await request.json();}catch{return json({success:false,error:"invalid-confirmation"},400);}
    const [{data:target},{data:identity},{count:ownedEvents},{count:activeAdmins}]=await Promise.all([
      admin.from("profiles").select("id,full_name,role,is_active,login_username,login_email,login_phone").eq("id",userId).maybeSingle(),
      admin.from("user_login_identities").select("normalized_username").eq("user_id",userId).maybeSingle(),
      admin.from("events").select("id",{count:"exact",head:true}).eq("organizer_id",userId),
      admin.from("profiles").select("id",{count:"exact",head:true}).eq("role","admin").eq("is_active",true),
    ]);
    if(!target)return json({success:false,error:"user-not-found"},404);
    if(target.role==="admin"&&target.is_active&&(activeAdmins??0)<=1)return json({success:false,error:"cannot-delete-last-administrator"},400);
    if((ownedEvents??0)>0)return json({success:false,error:"user-owns-protected-records",dependencies:{events:ownedEvents}},409);
    const identifier=identity?.normalized_username||target.login_username||target.login_email?.split("@")[0]||userId;
    if(body.confirmation!==`DELETE ${identifier}`&&body.confirmation!==`FUTA ${identifier}`)return json({success:false,error:"invalid-confirmation"},400);
    if(!body.adminPassword||!requester.email)return json({success:false,error:"administrator-reauthentication-failed"},401);
    const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {error:verifyError}=await verifier.auth.signInWithPassword({email:requester.email,password:body.adminPassword});if(verifyError)return json({success:false,error:"administrator-reauthentication-failed"},401);
    const {error:deleteError}=await admin.auth.admin.deleteUser(userId);if(deleteError){console.error("Permanent user deletion failed",{userId,reason:deleteError.message});return json({success:false,error:"delete-failed"},500);}
    return json({success:true});
  }catch(error){console.error("Permanent user deletion route failed",error);return json({success:false,error:"delete-failed"},500);}
}
