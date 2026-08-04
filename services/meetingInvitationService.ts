import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms } from "@/services/beemSmsService";
import { financialProviderStatus, type FinancialChannel, type SendAggregate } from "@/services/financialNotificationEngine";
import { sendFinancialWhatsAppTemplate } from "@/services/whatsappCloudService";

export type MeetingAudience="all"|"pledged"|"partial"|"completed"|"manual";
export type MeetingRow={id:number;event_id:number;title:string;meeting_date:string;meeting_time:string;venue:string;map_url:string|null;note:string|null;status:"draft"|"active"|"completed"|"cancelled";created_at:string;updated_at:string};
type Pledge={id:number;event_id:number;full_name:string;normalized_phone:string|null;calculated_status:"pledged"|"partial"|"completed"|"cancelled"};
type Delivery={id:number;pledge_id:number;channel:FinancialChannel;delivery_status:string;retry_count:number;error_message:string|null;idempotency_key:string};
export type MeetingInvitationRow={pledgeId:number;contributor:string;phone:string|null;paymentStatus:Pledge["calculated_status"];channel:FinancialChannel;message:string;smsSegments:number;eligible:boolean;skippedReason:string|null;deliveryStatus:string|null;idempotencyKey:string;errorMessage:string|null};
export type MeetingInvitationPreview={meeting:MeetingRow;event:{id:number;title:string;event_date:string;language:"sw"|"en"};rows:MeetingInvitationRow[];provider:Record<FinancialChannel,{configured:boolean;message:string}>};

function tanzaniaDate(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Dar_es_Salaam",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const value=(type:string)=>parts.find(part=>part.type===type)?.value??"";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function mainEventCountdown(eventDate:string,now=new Date()){
  const today=tanzaniaDate(now);
  const difference=Math.round((Date.parse(`${eventDate}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86_400_000);
  if(difference===0)return "Tukio ni leo.";
  if(difference<0)return "Tarehe ya tukio imepita.";
  return `Zimebaki siku ${difference} kufikia siku ya tukio.`;
}
function meetingDateLabel(date:string){return new Intl.DateTimeFormat("sw-TZ",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Dar_es_Salaam"}).format(new Date(`${date}T12:00:00Z`))}
export function estimateSmsSegments(message:string){const gsm=/^[\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉÄÖÑÜ§¿äöñüà]*$/;const single=gsm.test(message)?160:70,continued=gsm.test(message)?153:67;return message.length<=single?1:Math.ceil(message.length/continued)}
export function buildMeetingInvitationMessage(input:{name:string;meeting:MeetingRow;eventTitle:string;eventDate:string}){
  const optional=[input.meeting.map_url?`Ramani: ${input.meeting.map_url}`:"",input.meeting.note?`Maelezo: ${input.meeting.note.trim()}`:""].filter(Boolean).join("\n");
  return [`Habari ${input.name.trim()||"Mchangiaji"},`,`Unakaribishwa kwenye ${input.meeting.title} kwa ajili ya maandalizi ya ${input.eventTitle}.`,`Tarehe: ${meetingDateLabel(input.meeting.meeting_date)}`,`Muda: ${input.meeting.meeting_time.slice(0,5)}`,`Mahali: ${input.meeting.venue}`,optional,mainEventCountdown(input.eventDate),"Smart Event Pass"].filter(Boolean).join("\n\n").replace(/\n{3,}/g,"\n\n").trim();
}
function safeError(value:unknown){return (value instanceof Error?value.message:"Meeting invitation delivery failed.").replace(/Bearer\s+[^\s,)]+/gi,"Bearer [redacted]").replace(/(access[_ -]?token|authorization)\s*[:=]\s*[^\s,)]+/gi,"$1=[redacted]").slice(0,500)}
function audienceStatuses(audience:MeetingAudience){return audience==="all"||audience==="manual"?["pledged","partial","completed"]:[audience]}

export async function previewMeetingInvitations(db:SupabaseClient,input:{eventId:number;meetingId:number;audience:MeetingAudience;manualPledgeIds:number[];requestedChannels:FinancialChannel[]}):Promise<MeetingInvitationPreview>{
  const [{data:event,error:eventError},{data:meeting,error:meetingError}]=await Promise.all([
    db.from("events").select("id,title,event_date,language,archived_at").eq("id",input.eventId).single(),
    db.from("event_meetings").select("*").eq("id",input.meetingId).eq("event_id",input.eventId).single(),
  ]);
  if(eventError||!event||event.archived_at)throw new Error("Event could not be loaded.");
  if(meetingError||!meeting)throw new Error("Meeting could not be loaded.");
  let query=db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,calculated_status").eq("event_id",input.eventId).in("calculated_status",audienceStatuses(input.audience));
  if(input.audience==="manual")query=input.manualPledgeIds.length?query.in("id",input.manualPledgeIds):query.in("id",[-1]);
  const {data,error}=await query;if(error)throw new Error("Meeting audience could not be loaded.");
  const pledges=((data??[]) as Pledge[]).filter(item=>item.calculated_status!=="cancelled");
  const ids=pledges.map(item=>item.id);
  const {data:history,error:historyError}=ids.length?await db.from("meeting_invitation_deliveries").select("id,pledge_id,channel,delivery_status,retry_count,error_message,idempotency_key").eq("meeting_id",input.meetingId).in("pledge_id",ids):{data:[],error:null};
  if(historyError)throw new Error("Meeting delivery history could not be loaded.");
  const language=event.language==="en"?"en":"sw",provider={sms:financialProviderStatus("sms",language,"meeting_invitation"),whatsapp:financialProviderStatus("whatsapp",language,"meeting_invitation")};
  const rows:MeetingInvitationRow[]=[];
  for(const pledge of pledges)for(const channel of input.requestedChannels){
    const key=`meeting-invitation:v1:${meeting.id}:${pledge.id}:${channel}`,existing=(history as Delivery[]).find(item=>item.idempotency_key===key);
    let reason:string|null=null;
    if(meeting.status==="cancelled")reason="meeting_cancelled";else if(!pledge.normalized_phone)reason="missing_phone";else if(!/^255[67]\d{8}$/.test(pledge.normalized_phone))reason="invalid_phone";else if(!provider[channel].configured)reason="provider_unavailable";else if(existing&&["sent","delivered","read"].includes(existing.delivery_status))reason="already_sent";else if(existing&&["queued","processing"].includes(existing.delivery_status))reason="in_progress";
    const message=buildMeetingInvitationMessage({name:pledge.full_name,meeting:meeting as MeetingRow,eventTitle:event.title,eventDate:event.event_date});
    rows.push({pledgeId:pledge.id,contributor:pledge.full_name,phone:pledge.normalized_phone,paymentStatus:pledge.calculated_status,channel,message,smsSegments:channel==="sms"?estimateSmsSegments(message):0,eligible:!reason,skippedReason:reason,deliveryStatus:existing?.delivery_status??null,idempotencyKey:key,errorMessage:existing?.error_message??null});
  }
  return {meeting:meeting as MeetingRow,event:{id:event.id,title:event.title,event_date:event.event_date,language},rows,provider};
}

export async function sendMeetingInvitations(db:SupabaseClient,input:{eventId:number;meetingId:number;audience:MeetingAudience;manualPledgeIds:number[];requestedChannels:FinancialChannel[]}):Promise<SendAggregate>{
  const preview=await previewMeetingInvitations(db,input),result:SendAggregate={queued:0,sent:0,failed:0,skipped:0,errors:[]};
  if(preview.meeting.status==="cancelled")return {queued:0,sent:0,failed:0,skipped:preview.rows.length,errors:["Cancelled meetings cannot send invitations."]};
  for(const row of preview.rows){
    const label=row.channel==="sms"?"SMS":"WhatsApp";
    if(!row.eligible){result.skipped+=1;result.errors.push(row.skippedReason==="already_sent"?`${row.contributor} was already invited through ${label}.`:row.skippedReason==="in_progress"?`${row.contributor}'s ${label} invitation is already in progress.`:row.skippedReason==="provider_unavailable"?preview.provider[row.channel].message:`${row.contributor} has no valid phone number.`);continue}
    const existing=await db.from("meeting_invitation_deliveries").select("id,delivery_status,retry_count").eq("idempotency_key",row.idempotencyKey).maybeSingle();
    if(existing.error){result.failed+=1;result.errors.push(`${row.contributor}'s ${label} delivery history could not be checked.`);continue}
    let log:{id:number}|null=null;
    if(existing.data&&["sent","delivered","read"].includes(existing.data.delivery_status)){result.skipped+=1;result.errors.push(`${row.contributor} was already invited through ${label}.`);continue}
    if(existing.data&&["queued","processing"].includes(existing.data.delivery_status)){result.skipped+=1;result.errors.push(`${row.contributor}'s ${label} invitation is already in progress.`);continue}
    if(existing.data?.delivery_status==="failed"){
      const retry=await db.from("meeting_invitation_deliveries").update({delivery_status:"processing",retry_count:Number(existing.data.retry_count??0)+1,last_attempt_at:new Date().toISOString(),recipient_phone:row.phone,message_body:row.message,error_code:null,error_message:null,failed_at:null}).eq("id",existing.data.id).eq("delivery_status","failed").select("id").maybeSingle();
      if(retry.error||!retry.data){result.failed+=1;result.errors.push(`${row.contributor}'s ${label} retry could not be prepared.`);continue}log=retry.data;
    }else if(existing.data){result.skipped+=1;result.errors.push(`${row.contributor}'s ${label} invitation cannot be retried in its current state.`);continue}
    else{
      const inserted=await db.from("meeting_invitation_deliveries").insert({meeting_id:preview.meeting.id,event_id:input.eventId,pledge_id:row.pledgeId,channel:row.channel,recipient_phone:row.phone,message_body:row.message,delivery_status:"processing",idempotency_key:row.idempotencyKey,retry_count:1,queued_at:new Date().toISOString(),last_attempt_at:new Date().toISOString()}).select("id").maybeSingle();
      if(inserted.error||!inserted.data){result.failed+=1;result.errors.push(`${row.contributor}'s ${label} invitation could not be recorded.`);continue}log=inserted.data;
    }
    result.queued+=1;
    try{
      let providerMessageId:string|undefined;
      if(row.channel==="sms"){const sent=await sendBeemSms({phoneNumber:row.phone!,message:row.message});if(!sent.success)throw new Error(sent.message);providerMessageId=sent.providerMessageId}
      else providerMessageId=(await sendFinancialWhatsAppTemplate({phoneNumber:row.phone!,language:preview.event.language,templateKind:"meeting_invitation",parameters:[row.contributor,preview.meeting.title,preview.event.title,meetingDateLabel(preview.meeting.meeting_date),preview.meeting.meeting_time.slice(0,5),preview.meeting.venue,preview.meeting.map_url??"—",preview.meeting.note??"—",mainEventCountdown(preview.event.event_date)]})).messageId;
      const saved=await db.from("meeting_invitation_deliveries").update({delivery_status:"sent",provider_message_id:providerMessageId??null,sent_at:new Date().toISOString(),error_code:null,error_message:null}).eq("id",log.id);
      if(saved.error){result.failed+=1;result.errors.push(`${row.contributor}'s ${label} invitation was accepted but could not be recorded.`);continue}result.sent+=1;
    }catch(cause){const message=safeError(cause);const saved=await db.from("meeting_invitation_deliveries").update({delivery_status:"failed",error_message:message,error_code:"provider_failure",failed_at:new Date().toISOString()}).eq("id",log.id);result.failed+=1;result.errors.push(message);if(saved.error)result.errors.push(`${row.contributor}'s ${label} failure could not be recorded.`)}
  }
  return result;
}
