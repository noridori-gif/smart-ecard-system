import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  const noStore={"Cache-Control":"no-store, max-age=0"};
  const json=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{...noStore,"Content-Type":"application/json"}});
  try{
    let body:{currentPassword?:string;newPassword?:string};try{body=await request.json();}catch{return json({success:false,error:"password-change-failed"},400);}
    if(!body.currentPassword||!body.newPassword||body.newPassword.length<8||body.currentPassword===body.newPassword)return json({success:false,error:"password-change-failed"},400);
    const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user?.email)return json({success:false,error:"password-change-failed"},401);
    const {error:verifyError}=await supabase.auth.signInWithPassword({email:user.email,password:body.currentPassword});if(verifyError)return json({success:false,error:"invalid-current-password"},400);
    const {error:updateError}=await supabase.auth.updateUser({password:body.newPassword});if(updateError)return json({success:false,error:"password-change-failed"},400);
    const {error:profileError}=await supabase.from("profiles").update({force_password_change:false,updated_at:new Date().toISOString()}).eq("id",user.id);if(profileError){console.error("Password/profile reconciliation required",{userId:user.id});return json({success:false,error:"password-change-failed"},500);}
    return json({success:true});
  }catch(error){console.error("Change password route failed",error);return json({success:false,error:"password-change-failed"},500);}
}
