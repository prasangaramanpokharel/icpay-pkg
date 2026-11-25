export const CRON_PRESETS = {
  EVERY_MINUTE: "* * * * *",
  EVERY_5_MINUTES: "*/5 * * * *",
  EVERY_15_MINUTES: "*/15 * * * *",
  EVERY_30_MINUTES: "*/30 * * * *",
  HOURLY: "0 * * * *",
  DAILY: "0 0 * * *",
  WEEKLY: "0 0 * * 0",
  MONTHLY: "0 0 1 * *",
} as const

export function formatProjectId(id: bigint | number): string {
  const n = typeof id === "bigint" ? id : BigInt(id)
  return `cr_${n.toString(36).padStart(8, "0")}`
}

export function parseProjectId(handle: string): bigint | null {
  const trimmed = handle.trim().toLowerCase()
  if (!trimmed.startsWith("cr_")) {
    const rawNum = Number(trimmed)
    if (!Number.isNaN(rawNum) && rawNum > 0) return BigInt(rawNum)
    return null
  }
  const body = trimmed.slice(3)
  try {
    const val = BigInt(parseInt(body, 36))
    return val > 0n ? val : null
  } catch {
    return null
  }
}

export function isValidCron(expression: string): boolean {
  const trimmed = expression.trim()
  if (!trimmed) return false

  const aliases = ["@yearly", "@annually", "@monthly", "@weekly", "@daily", "@midnight", "@hourly"]
  if (aliases.includes(trimmed.toLowerCase())) return true

  const parts = trimmed.split(/\s+/)
  if (parts.length !== 5) return false

  const ranges: [number, number][] = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 7],
  ]

  return parts.every((part, idx) => {
    const [min, max] = ranges[idx]!
    if (part === "*") return true
    if (part.startsWith("*/")) {
      const step = Number(part.slice(2))
      return !Number.isNaN(step) && step > 0 && step <= max
    }
    const subParts = part.split(",")
    return subParts.every((sp) => {
      if (sp.includes("-")) {
        const [start, end] = sp.split("-").map(Number)
        return start !== undefined && end !== undefined && !Number.isNaN(start) && !Number.isNaN(end) && start >= min && end <= max && start <= end
      }
      const num = Number(sp)
      return !Number.isNaN(num) && num >= min && num <= max
    })
  })
}
