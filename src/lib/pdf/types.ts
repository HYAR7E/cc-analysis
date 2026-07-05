export type Currency = "PEN" | "USD";

export type RawTxn = {
  /** Consumption date (2nd date column on BCP rows). */
  date: Date;
  /** Processing/posting date (1st date column), when present. */
  operationDate?: Date;
  merchant: string;
  location?: string;
  country?: string;
  operationType?: string;
  description?: string;
  amount: number;
  currency: Currency;
  rawLine?: string;
};

export type ParsedStatement = {
  periodStart?: Date;
  periodEnd?: Date;
  transactions: RawTxn[];
};
