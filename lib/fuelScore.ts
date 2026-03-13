/**
 * Fleet fuel compliance grading: map 0–100% to letter grade and theme color.
 */

export function getFleetGrade(complianceRate: number): string {
  if (complianceRate >= 95) return "A+"
  if (complianceRate >= 90) return "A"
  if (complianceRate >= 85) return "A-"
  if (complianceRate >= 80) return "B+"
  if (complianceRate >= 75) return "B"
  if (complianceRate >= 70) return "B-"
  if (complianceRate >= 65) return "C+"
  if (complianceRate >= 60) return "C"
  if (complianceRate >= 55) return "C-"
  if (complianceRate >= 40) return "D"
  return "F"
}

export function getGradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase()
  if (letter === "A") return "text-[var(--success)]"
  if (letter === "B") return "text-blue-600 dark:text-blue-500"
  if (letter === "C") return "text-[var(--warning)]"
  return "text-destructive"
}
