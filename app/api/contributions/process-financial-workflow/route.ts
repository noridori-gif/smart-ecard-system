import { authenticatedFinanceClient, bearerToken, noStoreHeaders, sameOrigin } from "@/lib/financePortalServer";
import { serviceDatabase } from "@/lib/makeConnectorServer";
import { processWorkflowByIdempotencyKey } from "@/services/financialWorkflowProcessor";

export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Origin not allowed."},{status:403,headers:noStoreHeaders});
  const token=bearerToken(request);if(!token)return Response.json({error:"Not authorized."},{status:401,headers:noStoreHeaders});
  const client=authenticatedFinanceClient(token);const {data:auth}=await client.auth.getUser(token);if(!auth.user)return Response.json({error:"Not authorized."},{status:401,headers:noStoreHeaders});
  const body=await request.json().catch(()=>null) as {pledgeId?:unknown}|null,pledgeId=Number(body?.pledgeId);
  if(!Number.isInteger(pledgeId)||pledgeId<=0)return Response.json({error:"Invalid pledge."},{status:400,headers:noStoreHeaders});
  const {data:pledge}=await client.from("event_pledges").select("id").eq("id",pledgeId).maybeSingle();
  if(!pledge)return Response.json({error:"Not authorized."},{status:403,headers:noStoreHeaders});
  try{const origin=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"")||new URL(request.url).origin;const acknowledgement=await processWorkflowByIdempotencyKey(serviceDatabase(),`pledge-acknowledgement:${pledgeId}`,origin);return Response.json({acknowledgement},{headers:noStoreHeaders});}
  catch{return Response.json({acknowledgement:{status:"queued",message:"Pledge saved. Acknowledgement queued for delivery."}},{headers:noStoreHeaders});}
}
