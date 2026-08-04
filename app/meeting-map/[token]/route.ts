import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const HOME="https://www.smarteventpass.co.tz/";
const TOKEN=/^[a-f0-9]{36}$/i;

function serviceClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

function safeStoredMapUrl(value:string|null){
  if(!value)return null;
  try{
    const url=new URL(value),host=url.hostname.toLowerCase().replace(/\.$/,"");
    if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
    if(host==="maps.google.com"||host==="maps.app.goo.gl")return url;
    if(host==="www.google.com"&&/^\/maps(?:\/|$)/i.test(url.pathname))return url;
    if(host==="goo.gl"&&/^\/maps(?:\/|$)/i.test(url.pathname))return url;
  }catch{}
  return null;
}

function redirect(destination:URL|string){
  const response=NextResponse.redirect(destination,302);
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
}

export async function GET(_request:Request,context:{params:Promise<{token:string}>}){
  const token=(await context.params).token;
  if(!TOKEN.test(token))return redirect(HOME);
  const db=serviceClient();if(!db)return redirect(HOME);
  const {data,error}=await db.from("event_meetings").select("map_url,venue").eq("public_map_token",token.toLowerCase()).maybeSingle();
  if(error||!data)return redirect(HOME);
  const stored=safeStoredMapUrl(data.map_url);
  if(stored)return redirect(stored);
  const venue=typeof data.venue==="string"&&data.venue.trim()?data.venue.trim():"Smart Event Pass Tanzania";
  return redirect(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`);
}
