import { type DateRange } from "react-day-picker"

export type DateRangePreset = "yesterday" | "week" | "month"

export type PeriodTabValue = DateRangePreset

export function getYesterdayRange(): DateRange {
  const now = new Date()
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return { from: startOfYesterday, to: startOfYesterday }
}

export function getThisWeekRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { from, to }
}

export function getThisMonthRange(): DateRange {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return { from, to }
}

/** True when range is exactly calendar yesterday (from and to are start of yesterday). Distinguishes Yesterday from This Week on Monday. */
export function isExactlyYesterdayRange(range: DateRange | undefined): boolean {
  if (!range?.from) return false
  const to = range.to ?? range.from
  const now = new Date()
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayStr = startOfYesterday.toDateString()
  return to.getTime() === range.from.getTime() && range.from.toDateString() === yesterdayStr
}

export function rangeMatches(
  range: DateRange | undefined,
  preset: DateRangePreset
): boolean {
  if (!range?.from) return false
  const fromStr = range.from.toDateString()
  const toStr = (range.to ?? range.from).toDateString()
  if (preset === "yesterday") {
    const now = new Date()
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayStr = startOfYesterday.toDateString()
    return fromStr === yesterdayStr && toStr === yesterdayStr
  }
  if (preset === "week") {
    const week = getThisWeekRange()
    if (!week.from || !week.to) return false
    const rangeTo = range.to ?? range.from
    return (
      range.from.toDateString() === week.from.toDateString() &&
      rangeTo.getTime() >= week.from.getTime() &&
      rangeTo.getTime() <= week.to.getTime()
    )
  }
  if (preset === "month") {
    const month = getThisMonthRange()
    if (!month.from || !month.to) return false
    const rangeTo = range.to ?? range.from
    return (
      range.from.toDateString() === month.from.toDateString() &&
      rangeTo.getTime() >= month.from.getTime() &&
      rangeTo.getTime() <= month.to.getTime()
    )
  }
  return false
}

/** Comparison period label and range for trend badges. Reflects the selected date range above. */
export function getComparisonPeriod(
  dateRange: DateRange | undefined
): { label: string; range: DateRange } | null {
  if (!dateRange?.from) return null
  const to = dateRange.to ?? dateRange.from
  if (rangeMatches(dateRange, "yesterday")) {
    const dayBeforeYesterday = new Date(to)
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1)
    return {
      label: "day before yesterday",
      range: { from: dayBeforeYesterday, to: dayBeforeYesterday },
    }
  }
  if (rangeMatches(dateRange, "week")) {
    const weekEnd = new Date(to)
    weekEnd.setDate(weekEnd.getDate() + 1)
    const prevWeekEnd = new Date(weekEnd)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
    const prevWeekStart = new Date(prevWeekEnd)
    prevWeekStart.setDate(prevWeekStart.getDate() - 6)
    return { label: "last week", range: { from: prevWeekStart, to: prevWeekEnd } }
  }
  if (rangeMatches(dateRange, "month")) {
    const prevMonthEnd = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 0)
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
    return { label: "last month", range: { from: prevMonthStart, to: prevMonthEnd } }
  }
  const fromMs = dateRange.from.getTime()
  const toMs = to.getTime()
  const spanMs = toMs - fromMs + 86400000
  const prevTo = new Date(fromMs - 86400000)
  const prevFrom = new Date(prevTo.getTime() - spanMs + 86400000)
  return { label: "previous period", range: { from: prevFrom, to: prevTo } }
}
