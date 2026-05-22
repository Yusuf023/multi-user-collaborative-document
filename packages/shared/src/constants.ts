export const ROLES = ["owner", "editor", "reviewer", "viewer"] as const
export type Role = (typeof ROLES)[number]

export const COLLABORATION_COLORS = [
  "#E57373", // red
  "#64B5F6", // blue
  "#81C784", // green
  "#FFB74D", // orange
  "#BA68C8", // purple
  "#4DB6AC", // teal
  "#F06292", // pink
  "#AED581", // light green
  "#FFD54F", // amber
  "#7986CB", // indigo
  "#4FC3F7", // light blue
  "#FF8A65", // deep orange
  "#A1887F", // brown
  "#90A4AE", // blue grey
  "#DCE775", // lime
  "#FFF176", // yellow
  "#CE93D8", // light purple
  "#80DEEA", // cyan
  "#FFAB91", // salmon
  "#C5E1A5" // light lime
] as const

export const TOKEN_LENGTH = 6
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
