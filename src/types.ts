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

