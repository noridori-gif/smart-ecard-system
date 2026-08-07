"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import PremiumWhatsAppCard, { whatsAppCardTotalHeight, type PremiumWhatsAppCardData, type PremiumWhatsAppTemplate } from "@/lib/PremiumWhatsAppCard";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import type { EventLanguage, InvitationTemplate, PhotoLayout } from "@/services/eventService";

const CARD_WIDTH = 1080;
const DEFAULT_BANNER_HEIGHT = 620;
const MIN_BANNER_HEIGHT = 480;
const MAX_BANNER_HEIGHT = 1500;
const PREVIEW_BOX_WIDTH = 300;
const PREVIEW_SCALE = PREVIEW_BOX_WIDTH / CARD_WIDTH;

function useCoverImageBannerHeight(coverImageUrl: string | null) {
  const [state, setState] = useState({ url: coverImageUrl, height: DEFAULT_BANNER_HEIGHT });

  if (state.url !== coverImageUrl) {
    setState({ url: coverImageUrl, height: coverImageUrl ? state.height : DEFAULT_BANNER_HEIGHT });
  }

  useEffect(() => {
    if (!coverImageUrl) return;

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;
      const natural = Math.round((CARD_WIDTH / image.naturalWidth) * image.naturalHeight);
      const height = Math.min(MAX_BANNER_HEIGHT, Math.max(MIN_BANNER_HEIGHT, natural));
      setState(prev => (prev.url === coverImageUrl ? { url: coverImageUrl, height } : prev));
    };
    image.onerror = () => {
      if (!cancelled) setState(prev => (prev.url === coverImageUrl ? { url: coverImageUrl, height: DEFAULT_BANNER_HEIGHT } : prev));
    };
    image.src = coverImageUrl;

    return () => {
      cancelled = true;
    };
  }, [coverImageUrl]);

  return state.height;
}

export type EventPreviewData = {
  title:string; eventType:string; brideName:string; groomName:string; language:EventLanguage;
  template:InvitationTemplate; photoLayout:PhotoLayout; invitationMessage?:string; coverImageUrl:string|null;
  eventDate:string; eventTime:string; venue:string; ceremonyTitle:string; ceremonyDate:string; ceremonyTime:string;
  ceremonyVenue:string; ceremonyMapUrl?:string; receptionMapUrl?:string; dressCode:string; primary:string; secondary:string; accent:string;
};

type Mode="invitation"|"whatsapp"|"pass";
type WhatsAppView="card"|"message";

export default function EventPreviewSwitcher({data,invitationPreview}:{data:EventPreviewData;invitationPreview:ReactNode}) {
  const {t}=useAppLanguage();
  const [mode,setMode]=useState<Mode>("invitation");
  const [whatsAppView,setWhatsAppView]=useState<WhatsAppView>("card");
  const modes: Array<[Mode,string]>=[["invitation",t("preview.invitation")],["whatsapp",t("preview.whatsappCard")],["pass",t("preview.eventPass")]];
  const names=data.brideName&&data.groomName?`${data.brideName} & ${data.groomName}`:data.brideName||data.title|| (data.language==="sw"?"Tukio Lako":"Your Event");
  const bannerHeight=useCoverImageBannerHeight(data.coverImageUrl);
  const totalCardHeight=whatsAppCardTotalHeight(data.photoLayout,bannerHeight);
  const payload=useMemo<PremiumWhatsAppCardData>(()=>({
    title:names, invitationMessage:data.invitationMessage?.trim()||(data.language==="sw"?"Tunayo furaha kukualika kushiriki nasi katika tukio hili maalumu.":"We are delighted to invite you to celebrate this special occasion with us."),
    date:data.eventDate||(data.language==="sw"?"Tarehe ya tukio":"Event date"), eventTime:data.eventTime||(data.language==="sw"?"Muda wa tukio":"Event time"), venue:data.venue||(data.language==="sw"?"Ukumbi wa sherehe":"Reception venue"),
    ceremonyTitle:data.ceremonyTitle, ceremonyTime:data.ceremonyTime, ceremonyVenue:data.ceremonyVenue, receptionVenue:data.venue,
    guestName:"Mr & Mrs Mgeni", dressCode:data.dressCode, allowedGuests:2, eventPassId:"SEP-PREVIEW", language:data.language,
    coverImageDataUrl:data.coverImageUrl, coverImageBannerHeight:bannerHeight, qrCodeDataUrl:null, primary:data.primary, secondary:data.secondary, accent:data.accent,
    photoLayout:data.photoLayout,
  }),[data,names,bannerHeight]);

  function keyNavigation(event:KeyboardEvent<HTMLButtonElement>,index:number){if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();const next=(index+(event.key==="ArrowRight"?1:-1)+modes.length)%modes.length;setMode(modes[next][0]);document.getElementById(`event-preview-${modes[next][0]}`)?.focus();}

  return <section aria-label={t("preview.region")} className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[26px] border border-stone-200 bg-[#f4f1eb] p-4 shadow-[0_18px_50px_rgba(28,25,23,.12)]">
    <div role="tablist" aria-label={t("preview.region")} className="grid grid-cols-3 rounded-xl bg-stone-200/70 p-1">{modes.map(([value,label],index)=><button id={`event-preview-${value}`} key={value} type="button" role="tab" aria-selected={mode===value} onKeyDown={event=>keyNavigation(event,index)} onClick={()=>setMode(value)} className={`min-h-10 rounded-lg px-2 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${mode===value?"bg-white text-slate-950 shadow-sm":"text-slate-600"}`}>{label}</button>)}</div>
    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800">{t("preview.only")}</p>
    <div role="tabpanel" className="mt-4 transition-opacity duration-200">
      {mode==="invitation"&&invitationPreview}
      {mode==="whatsapp"&&<div><div className="mb-3 flex justify-center gap-1"><button type="button" aria-pressed={whatsAppView==="card"} onClick={()=>setWhatsAppView("card")} className={`rounded-full px-3 py-2 text-xs font-bold ${whatsAppView==="card"?"bg-slate-950 text-white":"bg-white"}`}>{t("preview.cardImage")}</button><button type="button" aria-pressed={whatsAppView==="message"} onClick={()=>setWhatsAppView("message")} className={`rounded-full px-3 py-2 text-xs font-bold ${whatsAppView==="message"?"bg-slate-950 text-white":"bg-white"}`}>{t("preview.messageView")}</button></div>{whatsAppView==="card"?<div className="mx-auto w-[300px] overflow-hidden rounded-xl bg-white shadow-xl" style={{height:totalCardHeight*PREVIEW_SCALE}}><div style={{width:CARD_WIDTH,height:totalCardHeight,transform:`scale(${PREVIEW_SCALE})`,transformOrigin:"top left"}}><PremiumWhatsAppCard data={payload} template={data.template as PremiumWhatsAppTemplate}/></div></div>:<MessagePreview data={data} names={names}/>}</div>}
      {mode==="pass"&&<div className="rounded-2xl border-2 border-dashed bg-white p-5 text-center shadow-sm" style={{borderColor:data.accent}}><p className="text-xs font-black uppercase tracking-[.18em]" style={{color:data.primary}}>Smart Event Pass</p><h3 className="mt-4 font-serif text-2xl font-black">{names}</h3><p className="mt-3 text-sm">Mr & Mrs Mgeni · 2</p><div className="mx-auto mt-5 grid h-28 w-28 place-items-center border-4 text-xs font-black">PREVIEW QR</div><p className="mt-4 font-mono font-black">SEP-PREVIEW</p></div>}
    </div>
  </section>;
}

function MessagePreview({data,names}:{data:EventPreviewData;names:string}) {const sw=data.language==="sw";return <div className="rounded-2xl bg-[#efeae2] p-3"><div className="ml-auto rounded-xl rounded-tr-sm bg-[#d9fdd3] p-4 text-sm leading-6 shadow"><p>{sw?"Habari":"Hello"} <b>Mr & Mrs Mgeni</b>,</p><p className="mt-2">{sw?"Unakaribishwa kwenye":"You are invited to"} <b>{names}</b>.</p><div className="mt-2"><p>📅 {data.eventDate||(sw?"Tarehe ya tukio":"Event date")}</p><p>🕒 {data.eventTime||(sw?"Muda wa tukio":"Event time")}</p><p>📍 {data.venue||(sw?"Ukumbi wa sherehe":"Reception venue")}</p></div><p className="mt-2">🎫 Event Pass ID: <b>SEP-PREVIEW</b><br/>👥 {sw?"Wageni":"Guests"}: <b>2</b></p><p className="mt-2 text-emerald-800 underline">https://smart-event-pass.example/preview</p></div><div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs font-bold text-sky-700"><span className="rounded-lg bg-white p-3">{sw?"Nitafika":"Accept"}</span><span className="rounded-lg bg-white p-3">{sw?"Sitafika":"Decline"}</span></div></div>}
