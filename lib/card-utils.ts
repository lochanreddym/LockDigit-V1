import { ImageSourcePropType } from "react-native";

export type CardBrand = "Visa" | "Mastercard" | "Amex" | "Discover" | "Unknown";

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits) return "Unknown";

  const num2 = parseInt(digits.substring(0, 2), 10);
  const num4 = parseInt(digits.substring(0, 4), 10);
  const num6 = parseInt(digits.substring(0, 6), 10);

  if (digits[0] === "4") return "Visa";

  if (
    (num2 >= 51 && num2 <= 55) ||
    (num6 >= 222100 && num6 <= 272099)
  )
    return "Mastercard";

  if (num2 === 34 || num2 === 37) return "Amex";

  if (
    num4 === 6011 ||
    num2 === 65 ||
    (num2 >= 644 && num2 <= 649) ||
    (num6 >= 622126 && num6 <= 622925)
  )
    return "Discover";

  return "Unknown";
}

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function extractLast4(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  return digits.slice(-4);
}

export const ISSUING_BANKS = [
  { id: "bofa", label: "Bank of America" },
  { id: "chase", label: "Chase" },
  { id: "usbank", label: "US Bank" },
  { id: "wellsfargo", label: "Wells Fargo" },
  { id: "citi", label: "Citi" },
  { id: "capitalone", label: "Capital One" },
  { id: "other", label: "Other" },
] as const;

export type IssuingBankId = (typeof ISSUING_BANKS)[number]["id"];

const bankLogoMap: Record<string, ImageSourcePropType> = {
  "Bank of America": require("@/assets/images/banks/bofa.png"),
  "Chase": require("@/assets/images/banks/chase.png"),
  "US Bank": require("@/assets/images/banks/usbank.png"),
  "Wells Fargo": require("@/assets/images/banks/wellsfargo.png"),
  "Citi": require("@/assets/images/banks/citi.png"),
  "Capital One": require("@/assets/images/banks/capitalone.png"),
};

const defaultBankLogo: ImageSourcePropType = require("@/assets/images/banks/default.png");

export function getBankLogo(bankName: string): ImageSourcePropType {
  return bankLogoMap[bankName] ?? defaultBankLogo;
}
