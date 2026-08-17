// Pure meeting-invitation message builders, split out of meetingInvitationService.ts
// so the sample-preview UI (a client component) can call the same default SMS
// builder the real send path uses, without pulling in that file's "server-only"
// Supabase/provider-sending dependencies.
import { renderCustomSmsTemplate, type PledgeMessageValues } from "@/services/pledgeMessageService";

export type MeetingRow = {
  id: number;
  event_id: number;
  title: string;
  meeting_date: string;
  meeting_time: string;
  venue: string;
  map_url: string | null;
  note: string | null;
  public_map_token?: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
};

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
export function meetingDateLabel(date:string){return new Intl.DateTimeFormat("sw-TZ",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Dar_es_Salaam"}).format(new Date(`${date}T12:00:00Z`))}
const GSM_BASIC=new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"));
const GSM_EXTENSION=new Set(Array.from("^{}\\[~]|€"));
export type SmsAnalysis={encoding:"GSM-7"|"UCS-2";units:number;segments:number;singleLimit:number;multipartLimit:number};
export function analyzeSms(message:string):SmsAnalysis{
  let gsmUnits=0,gsm=true;
  for(const character of Array.from(message)){if(GSM_BASIC.has(character))gsmUnits+=1;else if(GSM_EXTENSION.has(character))gsmUnits+=2;else{gsm=false;break}}
  const encoding=gsm?"GSM-7":"UCS-2",units=gsm?gsmUnits:Array.from(message).reduce((total,character)=>total+(character.codePointAt(0)!>0xffff?2:1),0),singleLimit=gsm?160:70,multipartLimit=gsm?153:67;
  return {encoding,units,segments:units<=singleLimit?1:Math.ceil(units/multipartLimit),singleLimit,multipartLimit};
}
export function estimateSmsSegments(message:string){return analyzeSms(message).segments}
function compactDate(date:string){const [year,month,day]=date.split("-");return `${day}/${month}/${year}`}
function shortGreetingName(fullName:string){
  const normalized=fullName.trim().replace(/\s+/g," ");if(!normalized)return "Mgeni";
  const couple=normalized.match(/^(Mr\.?\s*&\s*Mrs\.?|Mrs\.?\s*&\s*Mr\.?)\s+([^\s,]+)/i);if(couple)return `${couple[1]} ${couple[2]}`;
  const meaningful=normalized.split(" ").find(part=>! /^(mr|mrs|miss|ms|dr|prof|rev|sheikh|shekhe)\.?$/i.test(part)&&part!=="&");return meaningful?.replace(/^[,.;]+|[,.;]+$/g,"")||"Mgeni";
}
export function compactCountdown(eventDate:string,now=new Date()){
  const standard=mainEventCountdown(eventDate,now),match=standard.match(/^Zimebaki siku (\d+)/);return match?`Zimebakia siku ${match[1]} kufikia harusi.`:standard;
}
function normalizeRequiredText(value:string,fallback:string){return value.trim().replace(/\s+/g," ")||fallback}
function shortenAtWords(value:string,maxWords:number){const words=value.split(" ");return words.length<=maxWords?value:`${words.slice(0,maxWords).join(" ")}...`}

export function buildMeetingInvitationSms(input:{name:string;meeting:MeetingRow;eventTitle:string;eventDate:string;now?:Date}){
  const name=shortGreetingName(input.name),eventTitle=normalizeRequiredText(input.eventTitle,"Tukio"),date=compactDate(input.meeting.meeting_date),time=input.meeting.meeting_time.slice(0,5),venue=normalizeRequiredText(input.meeting.venue,"Mahali haijatajwa"),countdown=compactCountdown(input.eventDate,input.now);
  const compose=(eventName:string)=>`Habari ${name},\nUnakaribishwa kwenye kikao cha maandalizi ya harusi ya ${eventName}: ${date}, ${time}, ${venue}.\n${countdown}`;
  let message=compose(eventTitle);
  if(analyzeSms(message).segments>1){const words=eventTitle.split(" ");for(let count=words.length-1;count>=1;count-=1){const candidate=compose(shortenAtWords(eventTitle,count));message=candidate;if(analyzeSms(candidate).segments===1)break}}
  return message;
}
// Uses the organiser's custom SMS wording when set, otherwise falls back to the
// hardcoded default -- same resolve-then-fallback shape as resolveFinancialSmsMessage.
export function resolveMeetingInvitationSms(input:{name:string;meeting:MeetingRow;eventTitle:string;eventDate:string;customTemplate?:string|null;now?:Date}){
  if(input.customTemplate?.trim()){
    const values:PledgeMessageValues={
      guestName:input.name,eventTitle:input.eventTitle,pledgedAmount:"0",totalPaid:"0",balance:"0",
      meetingLocation:normalizeRequiredText(input.meeting.venue,"Mahali haijatajwa"),
      meetingTime:input.meeting.meeting_time.slice(0,5),
      meetingDate:compactDate(input.meeting.meeting_date),
      meetingTitle:input.meeting.title,
    };
    return renderCustomSmsTemplate(input.customTemplate,values);
  }
  return buildMeetingInvitationSms(input);
}
export function buildMeetingInvitationMessage(input:{name:string;meeting:MeetingRow;eventTitle:string;eventDate:string}){
  const note=input.meeting.note?.trim()||"Tafadhali fika kwa wakati",countdown=compactCountdown(input.eventDate);
  return `Habari ${input.name.trim()||"Mchangiaji"},\n\nTunapenda kukukaribisha kwenye ${input.meeting.title} ya ${input.eventTitle}. Kikao hiki ni sehemu muhimu ya maandalizi ya tukio, na ushiriki wako utathaminiwa.\n\n🗓️ Tarehe: ${meetingDateLabel(input.meeting.meeting_date)}\n🕐 Muda: ${input.meeting.meeting_time.slice(0,5)}\n📍 Mahali: ${input.meeting.venue}\n📝 Maelezo: ${note}\n\n${countdown}\n\nAsante na karibu.\n\nSmart Event Pass`;
}
