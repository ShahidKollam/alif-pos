/** Money helpers — store and compute in paise (integer) */

export function toPaise(rupees) {
  const n = Number(rupees)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function fromPaise(paise) {
  return (Number(paise) || 0) / 100
}

export function formatMoney(paise) {
  const n = fromPaise(paise)
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
