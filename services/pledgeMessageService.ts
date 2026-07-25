export type PledgeMessageLanguage = "sw" | "en";
export type PledgeMessageType =
  | "pledge_reminder"
  | "partial_thank_you"
  | "completed_thank_you";

export type PledgeMessageValues = {
  guestName: string;
  eventTitle: string;
  pledgedAmount: string;
  totalPaid: string;
  balance: string;
  paymentAmount?: string;
};

export function formatTzs(value: string | number) {
  const [whole] = String(value || "0").split(".");
  return `TZS ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function normalizeTanzanianPhone(phone: string) {
  let value = phone.trim().replace(/\D/g, "");
  if (value.startsWith("2550")) value = `255${value.slice(4)}`;
  else if (value.startsWith("0")) value = `255${value.slice(1)}`;
  else if (/^[67]\d{8}$/.test(value)) value = `255${value}`;
  if (!/^255[67]\d{8}$/.test(value)) {
    throw new Error("Weka namba halali ya Tanzania.");
  }
  return value;
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
    if (type === "partial_thank_you") {
      return `Hello ${name},\n\nThank you for your contribution of ${payment} towards ${values.eventTitle}.\n\nTotal received: ${paid}\nYour pledge balance: ${balance}\n\nWe truly appreciate your contribution.\nSmart Event Pass`;
    }
    if (type === "completed_thank_you") {
      return `Hello ${name},\n\nThank you very much for completing your pledge of ${pledge} towards ${values.eventTitle}.\n\nYour contribution has been received in full.\nWe deeply appreciate your support.\n\nSmart Event Pass`;
    }
    return `Hello ${name},\n\nThis is a reminder about your pledge of ${pledge} towards ${values.eventTitle}.\n\nAmount received: ${paid}\nBalance: ${balance}\n\nThank you for your support.\nSmart Event Pass`;
  }

  if (type === "partial_thank_you") {
    return `Habari ${name},\n\nAsante kwa mchango wako wa ${payment} kwa ajili ya ${values.eventTitle}.\n\nJumla iliyopokelewa: ${paid}\nSalio la ahadi yako: ${balance}\n\nTunathamini sana mchango wako.\nSmart Event Pass`;
  }
  if (type === "completed_thank_you") {
    return `Habari ${name},\n\nAsante sana kwa kukamilisha ahadi yako ya ${pledge} kwa ajili ya ${values.eventTitle}.\n\nMchango wako umepokelewa kikamilifu.\nMungu akubariki.\n\nSmart Event Pass`;
  }
  return `Habari ${name},\n\nUnakumbushwa kuhusu ahadi yako ya ${pledge} kwa ajili ya ${values.eventTitle}.\n\nKiasi kilichopokelewa: ${paid}\nSalio: ${balance}\n\nAsante kwa ushirikiano wako.\nSmart Event Pass`;
}
