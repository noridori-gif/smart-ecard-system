import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  const noStore={"Cache-Control":"no-store, max-age=0"};
  let body:{currentPassword?:string;newPassword?:string};try{body=await request.json();}catch{return NextResponse.json({error:"Request si sahihi."},{status:400,headers:noStore});}
  if(!body.currentPassword||!body.newPassword||body.newPassword.length<8)return NextResponse.json({error:"Password mpya lazima iwe na characters 8 au zaidi."},{status:400,headers:noStore});
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user?.email)return NextResponse.json({error:"Session haijapatikana."},{status:401,headers:noStore});
  const {error:verifyError}=await supabase.auth.signInWithPassword({email:user.email,password:body.currentPassword});if(verifyError)return NextResponse.json({error:"Current password si sahihi."},{status:400,headers:noStore});
  const {error:updateError}=await supabase.auth.updateUser({password:body.newPassword});if(updateError)return NextResponse.json({error:updateError.message},{status:400,headers:noStore});
  const {error:profileError}=await supabase.from("profiles").update({force_password_change:false,updated_at:new Date().toISOString()}).eq("id",user.id);if(profileError)return NextResponse.json({error:profileError.message},{status:500,headers:noStore});
  return NextResponse.json({success:true},{headers:noStore});
}
