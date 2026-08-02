import "server-only";
import { cache } from "react";
import { hashPublicPledgeValue, publicPledgeClient } from "@/lib/publicPledge";

export type PublicPledgeInfo={valid:true;event_name:string;title:string|null;message:string|null;language:"sw"|"en";event_date:string|null;event_time:string|null;venue:string|null;cover_image_url:string|null;invitation_template:string|null;theme_primary_color:string|null;theme_secondary_color:string|null;theme_accent_color:string|null;updated_at:string}|{valid:false};

export function pledgePreviewVersion(info:Extract<PublicPledgeInfo,{valid:true}>){const milliseconds=Date.parse(info.updated_at);return Number.isFinite(milliseconds)?Math.floor(milliseconds/1000):0}

export const getPublicPledgeInfo=cache(async(token:string):Promise<PublicPledgeInfo>=>{
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {valid:false};
 try{const {data,error}=await publicPledgeClient().rpc("get_public_pledge_link",{supplied_token_hash:hashPublicPledgeValue(token)});if(error||!data||data.valid!==true)return {valid:false};return data as PublicPledgeInfo}catch{return {valid:false}}
});

export function canonicalAppUrl(){
 const configured=(process.env.NEXT_PUBLIC_APP_URL||"").trim().replace(/\/+$/,"");
 if(configured){try{const url=new URL(configured);if(url.protocol==="https:"||process.env.NODE_ENV!=="production"&&url.protocol==="http:")return url.origin}catch{}}
 return process.env.NODE_ENV==="production"?"https://smarteventpass.co.tz":"http://localhost:3000";
}

export function publicCoverUrl(value:string|null){if(!value)return null;try{const url=new URL(value);return url.protocol==="https:"||process.env.NODE_ENV!=="production"&&url.protocol==="http:"?url.toString():null}catch{return null}}

export function pledgePreviewCopy(info:Extract<PublicPledgeInfo,{valid:true}>){const sw=info.language==="sw";return {label:sw?"Ahadi ya Mchango":"Contribution Pledge",action:sw?"Weka ahadi yako kwa usalama":"Submit your pledge securely",cta:sw?"Fungua link kuweka ahadi yako":"Open the link to make your pledge",trust:sw?"Imewezeshwa na Smart Event Pass":"Powered by Smart Event Pass",description:info.message|| (sw?`Weka ahadi yako ya mchango kwa ajili ya ${info.event_name} kwa usalama.`:`Submit your contribution pledge for ${info.event_name} securely.`)}}
