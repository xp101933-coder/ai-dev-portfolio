export type CategoryKey = "claude-code" | "automation" | "claude-api" | "web-app";
export type FilterKey = "all" | CategoryKey;

export interface ProjectLinks {
  readonly github: string;
  readonly x: string;
}

export interface Project {
  readonly id: number;
  readonly title: string;
  readonly category: CategoryKey;
  readonly emoji: string;
  readonly image: string;
  readonly summary: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly links: ProjectLinks;
}

export const CATEGORY_LABELS: Record<FilterKey, string> = {
  "all":         "All",
  "claude-code": "Claude Code",
  "automation":  "Automation",
  "claude-api":  "Claude API",
  "web-app":     "Web App",
} as const;
