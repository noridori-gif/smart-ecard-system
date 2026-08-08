export type PledgeMessageLanguage = "sw" | "en";
export type PledgeMessageType =
  | "pledge_reminder"
  | "pledge_acknowledgement"
  | "payment_received"
  | "pledge_thank_you"
  | "partial_thank_you"
  | "completed_thank_you";

export type PledgeMessageValues = {
  guestName: string;
  eventTitle: string;
  pledgedAmount: string;
  totalPaid: string;
  balance: string;
  paymentAmount?: string;
  completionDate?: string | null;
};

export function formatTzs(value: string | number) {
  const [whole] = String(value || "0").split(".");
  return `TZS ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function normalizeTanzanianPhone(phone: string) {
  let value = phone.trim().replace(/\D/g, "");
  if (!value) return "";
  if (value.startsWith("2550")) value = `255${value.slice(4)}`;
  else if (value.startsWith("0")) value = `255${value.slice(1)}`;
  else if (/^[67]\d{8}$/.test(value)) value = `255${value}`;
  if (!/^255[67]\d{8}$/.test(value)) {
    throw new Error("Weka namba halali ya Tanzania.");
  }
  return value;
}

const GSM_BASIC=new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"));
const GSM_EXTENSION=new Set(Array.from("^{}\\[~]|€"));
export type SmsAnalysis={encoding:"GSM-7"|"UCS-2";units:number;segments:number;singleLimit:number;multipartLimit:number};
export function analyzeSms(message:string):SmsAnalysis{
  let gsm=true,gsmUnits=0;
  for(const character of Array.from(message)){if(GSM_BASIC.has(character))gsmUnits+=1;else if(GSM_EXTENSION.has(character))gsmUnits+=2;else{gsm=false;break}}
  const encoding=gsm?"GSM-7":"UCS-2",units=gsm?gsmUnits:Array.from(message).reduce((total,character)=>total+(character.codePointAt(0)!>0xffff?2:1),0),singleLimit=gsm?160:70,multipartLimit=gsm?153:67;
  return {encoding,units,segments:units<=singleLimit?1:Math.ceil(units/multipartLimit),singleLimit,multipartLimit};
}
function shortDisplayName(value:string){return value.trim().split(/\s+/)[0]?.slice(0,24)||"Mchangiaji"}
function shortenLabel(value:string,max:number){const clean=value.trim().replace(/\s+/g," ");return clean.length<=max?clean:`${clean.slice(0,Math.max(1,max-3)).trimEnd()}...`}
export function buildCompactFinancialSmsMessage(type:"pledge_acknowledgement"|"payment_received"|"pledge_thank_you",values:PledgeMessageValues){
  const name=shortDisplayName(values.guestName),pledged=formatTzs(values.pledgedAmount),paid=formatTzs(values.totalPaid),balance=formatTzs(values.balance),payment=formatTzs(values.paymentAmount??"0");
  const compose=(event:string)=>type==="pledge_acknowledgement"
    ?`Habari ${name},\nAhadi yako ya ${pledged} kwa ${event} imepokelewa. Salio ${balance}. Asante.`
    :type==="payment_received"
      ?`Habari ${name},\nTumepokea ${payment} kwa ahadi ya ${event}. Jumla ${paid}, salio ${balance}. Asante.`
      :`Habari ${name},\nTumepokea ${payment}. Ahadi yako ya ${pledged} kwa ${event} imekamilika. Asante sana.`;
  let event=shortenLabel(values.eventTitle,48),message=compose(event);
  for(let max=44;analyzeSms(message).segments>1&&max>=12;max-=4){event=shortenLabel(values.eventTitle,max);message=compose(event)}
  const analysis=analyzeSms(message);
  return {message,...analysis,warning:analysis.segments>1?"This message exceeds one SMS segment.":null};
}

export function buildPledgeMessage(
  type: PledgeMessageType,
  language: PledgeMessageLanguage,
  values: PledgeMessageValues
) {
  const name = values.guestName.trim() || "Contributor";
  const pledge = formatTzs(values.pledgedAmount);
  const paid = formatTzs(values.totalPaid);
  const balance = formatTzs(values.balance);
  const payment = formatTzs(values.paymentAmount ?? "0");

  if (language === "en") {
    if (type === "pledge_acknowledgement") {
      return `Hello ${name},\n\nWe have received your contribution pledge for ${values.eventTitle}.\n\nTotal pledged: ${pledge}\nAmount received: ${paid}\nBalance: ${balance}\n\nThank you for your pledge and support.\n\nSmart Event Pass`;
    }
    if (type === "partial_thank_you") {
      return `Hello ${name},\n\nThank you for your contribution of ${payment} towards ${values.eventTitle}.\n\nTotal received: ${paid}\nYour pledge balance: ${balance}\n\nWe truly appreciate your contribution.\nSmart Event Pass`;
    }
    if (type === "payment_received") {
      return `Hello ${name},\n\nWe received your payment of ${payment} for ${values.eventTitle}.\n\nTotal received: ${paid}\nBalance: ${balance}\n\nThank you.`;
    }
    if (type === "completed_thank_you" || type === "pledge_thank_you") {
      return `Hello ${name},\n\nThank you so much for completing your pledge for ${values.eventTitle}! Your generosity truly means a lot to us.\n\nPledged: ${pledge}\nReceived: ${paid}\nBalance: ${balance}\n\nWith heartfelt thanks,\nSmart Event Pass`;
    }
    return `Hello ${name},\n\nHope you're doing well! Just a gentle reminder about your pledge for ${values.eventTitle} — every contribution helps and we're truly grateful.\n\nPledged: ${pledge}\nReceived: ${paid}\nBalance: ${balance}\n\nThank you for your support.\nSmart Event Pass`;
  }

  if (type === "partial_thank_you") {
    return `Habari ${name},\n\nAsante kwa mchango wako wa ${payment} kwa ajili ya ${values.eventTitle}.\n\nJumla iliyopokelewa: ${paid}\nSalio la ahadi yako: ${balance}\n\nTunathamini sana mchango wako.\nSmart Event Pass`;
  }
  if (type === "payment_received") {
    return `Habari ${name},\n\nTumepokea malipo yako ya ${payment} kwa ajili ya ${values.eventTitle}.\n\nJumla iliyopokelewa: ${paid}\nSalio: ${balance}\n\nAsante.`;
  }
  if (type === "pledge_acknowledgement") {
    return `Habari ${name},\n\nTumepokea ahadi yako ya mchango kwa ajili ya ${values.eventTitle}.\n\nJumla ya ahadi: ${pledge}\nKiasi kilichopokelewa: ${paid}\nSalio: ${balance}\n\nAsante kwa ahadi na ushirikiano wako.\n\nSmart Event Pass`;
  }
  if (type === "completed_thank_you" || type === "pledge_thank_you") {
    return `Habari ${name},\n\nAsante sana kwa moyo wako wa ukarimu kwa kukamilisha ahadi yako kwa ajili ya ${values.eventTitle}! Mchango wako umetugusa sana.\n\nAhadi: ${pledge}\nUlichotoa: ${paid}\nSalio: ${balance}\n\nKwa shukrani za dhati,\nSmart Event Pass`;
  }
  return `Habari ${name},\n\nTunatumaini hali ni njema. Tunapenda kukukumbusha kwa upole kuhusu ahadi yako kwa ajili ya ${values.eventTitle} — mchango wako una maana kubwa kwetu.\n\nAhadi: ${pledge}\nUlichotoa: ${paid}\nSalio: ${balance}\n\nAsante kwa ushirikiano wako.\nSmart Event Pass`;
}
