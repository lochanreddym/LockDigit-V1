/**
 * Bill categories and their sub-services for Pay a Bill flow.
 * Category slug is used in route: /categories/[category]
 */

export const CATEGORIES = [
  {
    id: "utilities",
    icon: "flash-outline",
    label: "Utilities",
    color: "#FF9500",
    desc: "Electricity, Gas, Water, Waste & recycling",
    subServices: ["Electricity", "Water", "Gas", "Waste & recycling"],
  },
  {
    id: "telecom",
    icon: "call-outline",
    label: "Telecom",
    color: "#0A84FF",
    desc: "Phone, Mobile plans",
    subServices: ["Mobile", "Landline", "Prepaid"],
  },
  {
    id: "internet",
    icon: "wifi-outline",
    label: "Internet",
    color: "#5E5CE6",
    desc: "Broadband, Fiber",
    subServices: ["Broadband", "Fiber"],
  },
  {
    id: "cable-tv",
    icon: "tv-outline",
    label: "Cable & TV",
    color: "#FF3B30",
    desc: "Cable, Streaming",
    subServices: ["Cable", "Streaming", "DTH"],
  },
  {
    id: "subscriptions",
    icon: "repeat-outline",
    label: "Subscriptions",
    color: "#AF52DE",
    desc: "Streaming, Music, Apps",
    subServices: ["Streaming", "Music", "Apps", "Other"],
  },
  {
    id: "insurance",
    icon: "shield-outline",
    label: "Insurance",
    color: "#30D158",
    desc: "Health, Auto, Life",
    subServices: ["Health", "Auto", "Life", "Other"],
  },
  {
    id: "rent-mortgage",
    icon: "home-outline",
    label: "Rent & Mortgage",
    color: "#FF9500",
    desc: "Housing payments",
    subServices: ["Rent", "Mortgage"],
  },
  {
    id: "education",
    icon: "school-outline",
    label: "Education",
    color: "#0A84FF",
    desc: "Tuition, Loans",
    subServices: ["Tuition", "Student loans", "Other"],
  },
  {
    id: "transport",
    icon: "car-outline",
    label: "Transport",
    color: "#5E5CE6",
    desc: "Gas, Parking, Tolls",
    subServices: ["Gas & fuel", "Parking", "Tolls", "Other"],
  },
  {
    id: "healthcare",
    icon: "medkit-outline",
    label: "Healthcare",
    color: "#FF3B30",
    desc: "Medical, Dental",
    subServices: ["Medical", "Dental", "Pharmacy", "Other"],
  },
  {
    id: "banking",
    icon: "card-outline",
    label: "Banking",
    color: "#30D158",
    desc: "Loans, Credit cards",
    subServices: ["Credit card", "Loan", "Other"],
  },
  {
    id: "government",
    icon: "globe-outline",
    label: "Government",
    color: "#8E8E93",
    desc: "Taxes, Fees",
    subServices: ["Taxes", "Fees", "Fines", "Other"],
  },
  {
    id: "other",
    icon: "receipt-outline",
    label: "Other",
    color: "#8E8E93",
    desc: "Misc bills",
    subServices: ["Other bills"],
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}
