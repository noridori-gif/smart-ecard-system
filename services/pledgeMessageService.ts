export type PledgeMessageLanguage = "sw" | "en";
export type PledgeMessageType =
  | "pledge_reminder"
  | "pledge_acknowledgement"
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
      const timing = values.completionDate
        ? `The completion date you selected is ${values.completionDate}.`
        : "You can complete your contribution whenever you are ready.";
      return `Hello ${name},\nThank you for making a contribution pledge of ${pledge} for ${values.eventTitle}.\nWe have received your pledge successfully. ${timing}\nWe truly appreciate your support.\nSmart Event Pass`;
    }
    if (type === "partial_thank_you") {
      return `Hello ${name},\n\nThank you for your contribution of ${payment} towards ${values.eventTitle}.\n\nTotal received: ${paid}\nYour pledge balance: ${balance}\n\nWe truly appreciate your contribution.\nSmart Event Pass`;
    }
    if (type === "completed_thank_you" || type === "pledge_thank_you") {
      return `Hello ${name},\n\nThank you for completing your contribution pledge for\n${values.eventTitle}.\n\nTotal pledged: ${pledge}\nTotal received: ${paid}\nBalance: ${balance}\n\nWe sincerely appreciate your support and contribution.\n\nSmart Event Pass`;
    }
    return `Hello ${name},\n\nThis is a friendly reminder about your contribution pledge for ${values.eventTitle}.\n\nTotal pledge: ${pledge}\nAmount received: ${paid}\nOutstanding balance: ${balance}\n\nThank you for your support.\nSmart Event Pass`;
  }

  if (type === "partial_thank_you") {
    return `Habari ${name},\n\nAsante kwa mchango wako wa ${payment} kwa ajili ya ${values.eventTitle}.\n\nJumla iliyopokelewa: ${paid}\nSalio la ahadi yako: ${balance}\n\nTunathamini sana mchango wako.\nSmart Event Pass`;
  }
  if (type === "pledge_acknowledgement") {
    const timing = values.completionDate
      ? `Tarehe uliyochagua kukamilisha mchango ni ${values.completionDate}.`
      : "Unaweza kukamilisha mchango wako wakati utakapokuwa tayari.";
    return `Habari ${name},\nAsante kwa kuweka ahadi yako ya mchango wa ${pledge} kwa ajili ya ${values.eventTitle}.\nTumepokea ahadi yako kwa mafanikio. ${timing}\nTunathamini sana ushirikiano wako.\nSmart Event Pass`;
  }
  if (type === "completed_thank_you" || type === "pledge_thank_you") {
    return `Habari ${name},\n\nAsante sana kwa kukamilisha ahadi yako ya mchango kwa ajili ya\n${values.eventTitle}.\n\nJumla ya ahadi: ${pledge}\nJumla iliyopokelewa: ${paid}\nSalio: ${balance}\n\nTunathamini sana ushirikiano na mchango wako.\n\nSmart Event Pass`;
  }
  return `Habari ${name},\n\nTunapenda kukukumbusha kuhusu ahadi yako kwa ajili ya ${values.eventTitle}.\n\nJumla ya ahadi: ${pledge}\nKiasi kilichopokelewa: ${paid}\nSalio: ${balance}\n\nAsante kwa ushirikiano wako.\nSmart Event Pass`;
}
