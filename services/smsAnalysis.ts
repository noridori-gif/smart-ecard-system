// GSM-7 vs UCS-2 SMS length/segment analysis, shared by every SMS template
// preview (pledge/thank-you, meeting invitation, guest invitation).
const GSM_BASIC = new Set(
  Array.from(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
  )
);
const GSM_EXTENSION = new Set(Array.from("^{}\\[~]|€"));

export type SmsAnalysis = {
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segments: number;
  singleLimit: number;
  multipartLimit: number;
};

export function analyzeSms(message: string): SmsAnalysis {
  let gsm = true;
  let gsmUnits = 0;
  for (const character of Array.from(message)) {
    if (GSM_BASIC.has(character)) gsmUnits += 1;
    else if (GSM_EXTENSION.has(character)) gsmUnits += 2;
    else {
      gsm = false;
      break;
    }
  }
  const encoding = gsm ? "GSM-7" : "UCS-2";
  const units = gsm
    ? gsmUnits
    : Array.from(message).reduce(
        (total, character) =>
          total + (character.codePointAt(0)! > 0xffff ? 2 : 1),
        0
      );
  const singleLimit = gsm ? 160 : 70;
  const multipartLimit = gsm ? 153 : 67;
  return {
    encoding,
    units,
    segments: units <= singleLimit ? 1 : Math.ceil(units / multipartLimit),
    singleLimit,
    multipartLimit,
  };
}
