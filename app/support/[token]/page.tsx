import type {Metadata} from "next";
import {canonicalAppUrl,getPublicPledgeInfo,pledgePreviewCopy,pledgePreviewVersion} from "@/lib/publicPledgeMetadata";
import PublicPledgeForm from "./PublicPledgeForm";

type Props={params:Promise<{token:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {token}=await params,base=canonicalAppUrl(),canonical=`${base}/support/${encodeURIComponent(token)}`,info=await getPublicPledgeInfo(token);
 if(!info.valid){const title="Smart Event Pass",description="This secure event link is unavailable.",image=`${canonical}/opengraph-image`;return {metadataBase:new URL(base),title,description,alternates:{canonical},robots:{index:false,follow:false,noarchive:true},openGraph:{title,description,url:canonical,siteName:"Smart Event Pass",type:"website",images:[{url:image,width:1200,height:630,alt:"Smart Event Pass secure event link"}]},twitter:{card:"summary_large_image",title,description,images:[image]}}}
 const copy=pledgePreviewCopy(info),title=info.title?`${info.title} · ${info.event_name}`:`${copy.label} · ${info.event_name}`,image=`${canonical}/opengraph-image?v=${pledgePreviewVersion(info)}`;
 return {metadataBase:new URL(base),title,description:copy.description,alternates:{canonical},robots:{index:false,follow:false,noarchive:true},openGraph:{title,description:copy.description,url:canonical,siteName:"Smart Event Pass",type:"website",images:[{url:image,width:1200,height:630,alt:`${copy.label} — ${info.event_name}`}]},twitter:{card:"summary_large_image",title,description:copy.description,images:[image]}};
}
export default async function SupportPage({params}:Props){const {token}=await params,info=await getPublicPledgeInfo(token);return <PublicPledgeForm token={token} initialInfo={info.valid?info:null}/>}
