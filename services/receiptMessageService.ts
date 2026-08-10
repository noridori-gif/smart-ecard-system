import { formatTzs } from "@/services/pledgeMessageService";

export type FinanceReceipt = {
  receipt_number: string; event_name: string; contributor_name: string; contributor_phone: string;
  pledged_amount: string; payment_amount: string; total_paid: string; remaining_balance: string;
  payment_date: string; payment_method: string; payment_reference: string | null;
  provider: string | null; received_by: string | null;
  recorded_by: string; payment_status: "valid" | "voided";
};
export function buildReceiptMessage(receipt: FinanceReceipt, verificationUrl: string, language: "sw"|"en") {
  const completed = Number(receipt.remaining_balance) <= 0;
  if (language === "en") {
    if (completed) return `Hello ${receipt.contributor_name},\n\nThank you for completing your pledge of ${formatTzs(receipt.pledged_amount)} towards ${receipt.event_name}.\n\nReceipt number: ${receipt.receipt_number}\n\nReceipt:\n${verificationUrl}\n\nYour contribution has been received in full.\nSmart Event Pass`;
    return `Hello ${receipt.contributor_name},\n\nWe have received your contribution of ${formatTzs(receipt.payment_amount)} towards ${receipt.event_name}.\n\nTotal pledged: ${formatTzs(receipt.pledged_amount)}\nTotal received: ${formatTzs(receipt.total_paid)}\nBalance: ${formatTzs(receipt.remaining_balance)}\n\nReceipt number: ${receipt.receipt_number}\n\nReceipt:\n${verificationUrl}\n\nThank you for your contribution.\nSmart Event Pass`;
  }
  if (completed) return `Habari ${receipt.contributor_name},\n\nAsante sana kwa kukamilisha ahadi yako ya ${formatTzs(receipt.pledged_amount)} kwa ajili ya ${receipt.event_name}.\n\nNamba ya risiti: ${receipt.receipt_number}\n\nRisiti:\n${verificationUrl}\n\nMchango wako umepokelewa kikamilifu.\nMungu akubariki.\n\nSmart Event Pass`;
  return `Habari ${receipt.contributor_name},\n\nTumepokea mchango wako wa ${formatTzs(receipt.payment_amount)} kwa ajili ya ${receipt.event_name}.\n\nJumla ya ahadi: ${formatTzs(receipt.pledged_amount)}\nJumla iliyopokelewa: ${formatTzs(receipt.total_paid)}\nSalio: ${formatTzs(receipt.remaining_balance)}\n\nNamba ya risiti: ${receipt.receipt_number}\n\nRisiti:\n${verificationUrl}\n\nAsante sana kwa mchango wako.\nSmart Event Pass`;
}
