import {
  getDefaultCategoryAppearance,
  type CategoryAppearance,
} from "./theme";

export type DefaultRule = {
  pattern: string;
  category: string;
  priority: number;
};

export type DefaultCategory = {
  name: string;
  label: string;
} & CategoryAppearance;

function cat(name: string, label: string, index: number): DefaultCategory {
  const { emoji, color } = getDefaultCategoryAppearance(name, index);
  return { name, label, emoji, color };
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  cat("food", "Food", 0),
  cat("groceries", "Groceries", 1),
  cat("transport", "Transport", 2),
  cat("travel", "Travel", 3),
  cat("subscriptions", "Subscriptions", 4),
  cat("shopping", "Shopping", 5),
  cat("services", "Services", 6),
  cat("business", "Business", 7),
  cat("utilities", "Utilities", 8),
  cat("health", "Health", 9),
  cat("fees", "Fees", 10),
  cat("payments", "Payments", 11),
  cat("uncategorized", "Uncategorized", 12),
];

export const DEFAULT_CATEGORY_RULES: DefaultRule[] = [
  { pattern: "UBER EATS", category: "food", priority: 10 },
  { pattern: "DOORDASH", category: "food", priority: 10 },
  { pattern: "GRUBHUB", category: "food", priority: 10 },
  { pattern: "MCDONALD", category: "food", priority: 20 },
  { pattern: "STARBUCKS", category: "food", priority: 20 },
  { pattern: "CHIPOTLE", category: "food", priority: 20 },
  { pattern: "SUBWAY", category: "food", priority: 20 },
  { pattern: "PIZZA", category: "food", priority: 30 },
  { pattern: "RESTAURANT", category: "food", priority: 40 },
  { pattern: "CAFE", category: "food", priority: 40 },
  { pattern: "WHOLE FOODS", category: "groceries", priority: 10 },
  { pattern: "TRADER JOE", category: "groceries", priority: 10 },
  { pattern: "SAFEWAY", category: "groceries", priority: 10 },
  { pattern: "KROGER", category: "groceries", priority: 10 },
  { pattern: "COSTCO", category: "groceries", priority: 10 },
  { pattern: "WALMART", category: "groceries", priority: 20 },
  { pattern: "TARGET", category: "groceries", priority: 20 },

  { pattern: "UBER", category: "transport", priority: 30 },
  { pattern: "LYFT", category: "transport", priority: 10 },
  { pattern: "SHELL", category: "transport", priority: 10 },
  { pattern: "CHEVRON", category: "transport", priority: 10 },
  { pattern: "EXXON", category: "transport", priority: 10 },
  { pattern: "BP ", category: "transport", priority: 10 },
  { pattern: "PARKING", category: "transport", priority: 20 },
  { pattern: "METRO", category: "transport", priority: 20 },
  { pattern: "TRANSIT", category: "transport", priority: 20 },
  { pattern: "DELTA AIR", category: "travel", priority: 10 },
  { pattern: "UNITED AIRLINES", category: "travel", priority: 10 },
  { pattern: "AMERICAN AIRLINES", category: "travel", priority: 10 },
  { pattern: "AIRBNB", category: "travel", priority: 10 },
  { pattern: "HOTEL", category: "travel", priority: 20 },
  { pattern: "MARRIOTT", category: "travel", priority: 10 },
  { pattern: "HILTON", category: "travel", priority: 10 },

  { pattern: "NETFLIX", category: "subscriptions", priority: 10 },
  { pattern: "SPOTIFY", category: "subscriptions", priority: 10 },
  { pattern: "APPLE.COM/BILL", category: "subscriptions", priority: 10 },
  { pattern: "GOOGLE", category: "subscriptions", priority: 30 },
  { pattern: "ADOBE", category: "subscriptions", priority: 10 },
  { pattern: "OPENAI", category: "subscriptions", priority: 10 },
  { pattern: "ANTHROPIC", category: "subscriptions", priority: 10 },
  { pattern: "GITHUB", category: "subscriptions", priority: 10 },
  { pattern: "CURSOR", category: "subscriptions", priority: 10 },

  { pattern: "AMAZON", category: "shopping", priority: 30 },
  { pattern: "AMZN", category: "shopping", priority: 30 },
  { pattern: "BEST BUY", category: "shopping", priority: 10 },
  { pattern: "EBAY", category: "shopping", priority: 10 },
  { pattern: "ETSY", category: "shopping", priority: 10 },

  { pattern: "AWS", category: "business", priority: 5 },
  { pattern: "GOOGLE CLOUD", category: "business", priority: 5 },
  { pattern: "DIGITALOCEAN", category: "business", priority: 5 },
  { pattern: "VERCEL", category: "business", priority: 5 },
  { pattern: "NOTION", category: "business", priority: 5 },
  { pattern: "SLACK", category: "business", priority: 5 },
  { pattern: "ZOOM", category: "business", priority: 5 },
  { pattern: "STRIPE", category: "business", priority: 5 },

  { pattern: "PG&E", category: "utilities", priority: 10 },
  { pattern: "COMCAST", category: "utilities", priority: 10 },
  { pattern: "AT&T", category: "utilities", priority: 10 },
  { pattern: "VERIZON", category: "utilities", priority: 10 },
  { pattern: "T-MOBILE", category: "utilities", priority: 10 },

  { pattern: "CVS", category: "health", priority: 10 },
  { pattern: "WALGREENS", category: "health", priority: 10 },
  { pattern: "PHARMACY", category: "health", priority: 20 },

  { pattern: "PYU*UBER", category: "transport", priority: 5 },
  { pattern: "DLC*UBER", category: "transport", priority: 5 },
  { pattern: "APPARKA", category: "transport", priority: 5 },
  { pattern: "IZI*GASOLINERA", category: "transport", priority: 5 },
  { pattern: "ESTACION AVA", category: "transport", priority: 5 },
  { pattern: "AUTO ATENDIDO", category: "transport", priority: 10 },

  { pattern: "DLC*PEDIDOSYA", category: "food", priority: 5 },
  { pattern: "PEDIDOSYA", category: "food", priority: 5 },
  { pattern: "IZI*NAE CAFE", category: "food", priority: 5 },
  { pattern: "PASQUALE", category: "food", priority: 5 },
  { pattern: "POLLERIA", category: "food", priority: 5 },
  { pattern: "PARRILLADAS", category: "food", priority: 5 },
  { pattern: "OSSO BURGER", category: "food", priority: 5 },
  { pattern: "DELICASS", category: "food", priority: 5 },
  { pattern: "ROKYS", category: "food", priority: 5 },
  { pattern: "MIRAMAR", category: "food", priority: 10 },
  { pattern: "OTTO GRILL", category: "food", priority: 5 },
  { pattern: "LUCHITA", category: "food", priority: 5 },
  { pattern: "SARITA COLONIA", category: "food", priority: 5 },
  { pattern: "FRIDAYS", category: "food", priority: 5 },
  { pattern: "WUMAO", category: "food", priority: 5 },
  { pattern: "UNION LA ISLA", category: "food", priority: 5 },
  { pattern: "ORIGEN TOSTADORES", category: "food", priority: 5 },
  { pattern: "UP BURGE", category: "food", priority: 5 },
  { pattern: "PIZZA RA", category: "food", priority: 5 },
  { pattern: "TIENDA WYNK", category: "food", priority: 10 },
  { pattern: "KFC", category: "food", priority: 5 },
  { pattern: "11.11 BY CMAMI", category: "food", priority: 5 },
  { pattern: "EL HORNERO", category: "food", priority: 5 },
  { pattern: "EL BUEN", category: "food", priority: 10 },
  { pattern: "MATIER", category: "food", priority: 10 },

  { pattern: "OXXO", category: "groceries", priority: 5 },
  { pattern: "PVEA", category: "groceries", priority: 5 },
  { pattern: "NUTRIPOINT", category: "groceries", priority: 5 },
  { pattern: "ARUMA", category: "groceries", priority: 5 },
  { pattern: "CAJA CENTRAL RINCONADA", category: "groceries", priority: 10 },

  { pattern: "FALABELLA", category: "shopping", priority: 5 },
  { pattern: "RIPLEY", category: "shopping", priority: 5 },
  { pattern: "OECHSLE", category: "shopping", priority: 5 },
  { pattern: "ZARA", category: "shopping", priority: 5 },
  { pattern: "CREPIER", category: "shopping", priority: 5 },
  { pattern: "KOSECHA", category: "shopping", priority: 10 },

  { pattern: "CLINICA INTERNACIONAL", category: "health", priority: 5 },
  { pattern: "SMART FIT", category: "health", priority: 5 },

  { pattern: "LAVEX", category: "services", priority: 5 },
  { pattern: "EMILIO ALTHAUS", category: "services", priority: 10 },
  { pattern: "INVERSION Y CORPOR", category: "services", priority: 10 },
  { pattern: "EQUILIBRIO", category: "services", priority: 10 },
  { pattern: "OPENPAY", category: "services", priority: 20 },
  { pattern: "MDOPAGO", category: "services", priority: 20 },
  { pattern: "PAGOSERVIC", category: "services", priority: 10 },
  { pattern: "FREEPASS", category: "subscriptions", priority: 5 },

  { pattern: "GOOGLE TIMETREE", category: "subscriptions", priority: 5 },
  { pattern: "GOOGLE YOUTUBEPREMIUM", category: "subscriptions", priority: 5 },
  { pattern: "GOOGLE ONE", category: "subscriptions", priority: 5 },

  { pattern: "PGO CCE", category: "payments", priority: 1 },
  { pattern: "COM P. CCE", category: "fees", priority: 1 },
  { pattern: "INTERES", category: "fees", priority: 5 },
];
