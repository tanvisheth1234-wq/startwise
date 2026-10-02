// src/contracts/roadmap.ts   (SHARED, frozen) — T2
import type { Phase, TaskStatus } from "./common";
import type { Lang } from "./profile";

export type RoadmapTask = {
  id: string; key: string; title: string; phase: Phase; category: "legal" | "money" | "market" | "operations";
  status: TaskStatus; locked: boolean; dueDate: string | null; notes: string | null; evidenceUrl: string | null;
};

export type NextStep = { taskId: string; title: string; href: string } | null;

export interface RoadmapApi {
  onProfileConfirmed(planId: string): Promise<void>; // T1 calls after the profile card is confirmed
  getRoadmap(planId: string, lang: Lang): Promise<RoadmapTask[]>;
  getNextStep(planId: string, lang: Lang): Promise<NextStep>;
  markTaskDoneByKey(planId: string, key: string): Promise<void>; // T1 calls on a go verdict etc.
}
