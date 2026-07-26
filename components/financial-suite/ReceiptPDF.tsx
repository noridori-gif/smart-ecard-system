import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { formatTzs } from "@/services/pledgeMessageService";

const s = StyleSheet.create({
  page:{padding:42,fontFamily:"Helvetica",fontSize:10,color:"#0f172a"}, header:{backgroundColor:"#0f172a",padding:22,color:"#fff",borderRadius:8},
  brand:{fontSize:10,color:"#34d399",fontWeight:700}, title:{fontSize:24,fontWeight:700,marginTop:5}, receipt:{fontSize:12,marginTop:7},
  row:{flexDirection:"row",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#e2e8f0",paddingVertical:9},
  label:{color:"#64748b"}, value:{fontWeight:700,maxWidth:"60%",textAlign:"right"}, section:{marginTop:24},
  qr:{width:105,height:105,marginTop:20,alignSelf:"center"}, verify:{textAlign:"center",fontSize:8,color:"#64748b",marginTop:7},
  footer:{position:"absolute",bottom:30,left:42,right:42,textAlign:"center",fontSize:8,color:"#64748b"}
});
export default function ReceiptPDF({ receipt, verificationUrl, qrDataUrl }: { receipt: FinanceReceipt; verificationUrl: string; qrDataUrl: string }) {
  const rows = [
    ["Event",receipt.event_name],["Contributor",receipt.contributor_name],["Phone",receipt.contributor_phone],
    ["Pledged Amount",formatTzs(receipt.pledged_amount)],["Amount Paid",formatTzs(receipt.payment_amount)],
    ["Total Paid",formatTzs(receipt.total_paid)],["Remaining Balance",formatTzs(receipt.remaining_balance)],
    ["Payment Date",receipt.payment_date],["Payment Method",receipt.payment_method.replaceAll("_"," ")],
    ...(receipt.payment_reference?[["Payment Reference",receipt.payment_reference]]:[]),["Recorded By",receipt.recorded_by],
    ["Payment Status",receipt.payment_status === "voided" ? "Voided" : "Valid"],
  ];
  return <Document title={`Receipt ${receipt.receipt_number}`} author="Smart Event Pass"><Page size="A4" style={s.page}><View style={s.header}><Text style={s.brand}>SMART EVENT PASS</Text><Text style={s.title}>Contribution Receipt</Text><Text style={s.receipt}>{receipt.receipt_number}</Text></View><View style={s.section}>{rows.map(([label,value])=><View key={label} style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>)}</View>{qrDataUrl&&<Image src={qrDataUrl} style={s.qr} aria-label="Receipt verification QR code"/>}<Text style={s.verify}>Verify: {verificationUrl}</Text><Text style={s.footer}>Generated {new Date().toLocaleString()} · Smart Event Pass</Text></Page></Document>;
}
