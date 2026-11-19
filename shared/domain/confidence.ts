// Confidence bands (T5). The thresholds are an assumption, kept here only and stated in the README.
export type ConfidenceLevel = "low" | "medium" | "high";

export const MEDIUM_FROM = 0.6;
export const HIGH_FROM = 0.85;

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c < MEDIUM_FROM) return "low";
  if (c < HIGH_FROM) return "medium";
  return "high";
}
