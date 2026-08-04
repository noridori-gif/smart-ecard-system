import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authenticatedFinanceClient,bearerToken,checkPortalRateLimit,noStoreHeaders,sameOrigin } from "@/lib/financePortalServer";
import { previewMeetingInvitations,sendMeetingInvitations,type MeetingAudience } from "@/services/meetingInvitationService";
import type { FinancialChannel } from "@/services/financialNotificationEngine";

function reply(data:unknown,status=200){return NextResponse.json(data,{status,headers:noStoreHeaders})}
function serviceClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Meeting invitations are not configured.");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
function channels(value:unknown):FinancialChannel[]{return Array.isArray(value)?[...new Set(value.filter((item):item is FinancialChannel=>item==="sms"||item==="whatsapp"))]:[]}
function audience(value:unknown):MeetingAudience|null{return ["all","pledged","partial","completed","manual"].includes(String(value))?value as MeetingAudience:null}
function ids(value:unknown){return Array.isArray(value)?[...new Set(value.map(Number).filter(item=>Number.isInteger(item)&&item>0))]:[]}
function text(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
function safeUrl(value:unknown){const candidate=text(value,1000);if(!candidate)return null;try{const parsed=new URL(candidate);return parsed.protocol==="http:"||parsed.protocol==="https:"?parsed.toString():null}catch{return null}}

export async function POST(request:Request,context:{params:Promise<{eventId:string}>}){
 try{
  if(!sameOrigin(request))return reply({error:"Request not allowed."},403);
  if(!checkPortalRateLimit(request,"meeting-invitations",30))return reply({error:"Too many requests. Try again shortly."},429);
  const token=bearerToken(request);if(!token)return reply({error:"Not authorized."},401);
  const eventId=Number((await context.params).eventId);if(!Number.isInteger(eventId)||eventId<=0)return reply({error:"Invalid event."},400);
  const db=authenticatedFinanceClient(token),{data:auth}=await db.auth.getUser(token);if(!auth.user)return reply({error:"Not authorized."},401);
  const {data:authorized}=await db.rpc("can_manage_event_finance",{target_event_id:eventId});if(!authorized)return reply({error:"Not authorized."},403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null,action=body?.action;
  if(action==="list"){const {data,error}=await db.from("event_meetings").select("*").eq("event_id",eventId).order("meeting_date",{ascending:false});if(error)throw error;return reply({meetings:data??[]})}
  if(action==="save"){
    const title=text(body?.title,160),meetingDate=text(body?.meetingDate,10),meetingTime=text(body?.meetingTime,8),venue=text(body?.venue,240),note=text(body?.note,1000)||null,mapInput=text(body?.mapUrl,1000),mapUrl=safeUrl(mapInput);
    if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)||!/^\d{2}:\d{2}(?::\d{2})?$/.test(meetingTime)||!venue)return reply({error:"Meeting title, date, time and venue are required."},400);
    if(mapInput&&!mapUrl)return reply({error:"Meeting location URL must use HTTP or HTTPS."},400);
    const values={event_id:eventId,title,meeting_date:meetingDate,meeting_time:meetingTime,venue,map_url:mapUrl,note,status:"active"};
    const meetingId=Number(body?.meetingId);const result=Number.isInteger(meetingId)&&meetingId>0?await db.from("event_meetings").update(values).eq("id",meetingId).eq("event_id",eventId).neq("status","cancelled").select("*").maybeSingle():await db.from("event_meetings").insert(values).select("*").single();
    if(result.error||!result.data)throw result.error??new Error("Cancelled meetings cannot be edited.");return reply({meeting:result.data});
  }
  if(action==="cancel"){const meetingId=Number(body?.meetingId);if(!Number.isInteger(meetingId)||meetingId<=0)return reply({error:"Choose a meeting."},400);const {data,error}=await db.from("event_meetings").update({status:"cancelled"}).eq("id",meetingId).eq("event_id",eventId).select("*").maybeSingle();if(error||!data)throw error??new Error("Meeting could not be cancelled.");return reply({meeting:data})}
  const meetingId=Number(body?.meetingId),requestedChannels=channels(body?.channels),selectedAudience=audience(body?.audience);if(!Number.isInteger(meetingId)||meetingId<=0)return reply({error:"Choose a meeting."},400);if(!selectedAudience)return reply({error:"Choose a valid audience."},400);if(!requestedChannels.length)return reply({error:"Choose a delivery channel."},400);
  const input={eventId,meetingId,audience:selectedAudience,manualPledgeIds:ids(body?.manualPledgeIds),requestedChannels};
  if(action==="preview")return reply(await previewMeetingInvitations(db,input));
  if(action==="send"){if(body?.confirmed!==true)return reply({error:"Explicit confirmation is required."},400);return reply(await sendMeetingInvitations(serviceClient(),input))}
  return reply({error:"Unsupported action."},400);
 }catch(cause){console.error("Meeting invitation request failed:",cause);return reply({error:"Meeting invitation request failed."},500)}
}
