import type { Metadata } from "next";
import PublicPledgeForm from "./PublicPledgeForm";
export const metadata:Metadata={title:"Contribution Pledge | Smart Event Pass",robots:{index:false,follow:false}};
export default async function SupportPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <PublicPledgeForm token={token}/>}
