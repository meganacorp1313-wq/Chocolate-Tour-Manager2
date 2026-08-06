/** Prices are stored as integer USD. Matches the email formatting exactly. */
export function formatUsd(usd: number): string {
  return "$" + usd.toLocaleString("en-US")
}
