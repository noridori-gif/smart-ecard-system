import {
  authenticatedFinanceClient,bearerToken,generateReceiptToken,hashOrganiserToken,noStoreHeaders,sameOrigin,
} from "@/lib/financePortalServer";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Origin not allowed."},{status:403,headers:noStoreHeaders});
  const accessToken=bearerToken(request);if(!accessToken)return Response.json({error:"Not authorized."},{status:401,headers:noStoreHeaders});
  const client=authenticatedFinanceClient(accessToken);const {data:user}=await client.auth.getUser(accessToken);if(!user.user)return Response.json({error:"Not authorized."},{status:401,headers:noStoreHeaders});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;const pledgeId=Number(body?.pledgeId);const amount=typeof body?.amount==="string"?body.amount:"";const method=typeof body?.method==="string"?body.method:"";
  if(!Number.isInteger(pledgeId)||pledgeId<=0||!/^\d+(\.\d{1,2})?$/.test(amount))return Response.json({error:"Invalid payment."},{status:400,headers:noStoreHeaders});
  const rawToken=generateReceiptToken();const {data,error}=await client.rpc("record_pledge_payment_with_verification",{target_pledge_id:pledgeId,payment_amount:amount,paid_on:body?.date,method,reference:body?.reference??null,payment_provider:body?.provider??null,payment_notes:body?.notes??null,supplied_receipt_token_hash:hashOrganiserToken(rawToken)});
  if(error||!data)return Response.json({error:error?.message||"Payment could not be recorded."},{status:400,headers:noStoreHeaders});
  const origin=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"")||new URL(request.url).origin;
  return Response.json({...data,verificationUrl:`${origin}/r/${rawToken}`},{status:201,headers:noStoreHeaders});
}
