// src/features/roadmap/api.ts   OWNER: T2 (stub written by T1 in Phase 0)
import "server-only";
import type { RoadmapApi } from "@/contracts/roadmap";
import { FIXTURE_NEXT_STEP, FIXTURE_ROADMAP } from "@/fixtures/home-bakery";

export const roadmap: RoadmapApi = {
  async onProfileConfirmed(_planId) {}, // TODO(T2): generate plan_tasks from templates + rules (idempotent)
  async getRoadmap(_planId, _lang) { return FIXTURE_ROADMAP; }, // TODO(T2): read plan_tasks
  async getNextStep(_planId, _lang) { return FIXTURE_NEXT_STEP; }, // TODO(T2): first unlocked pending task
  async markTaskDoneByKey(_planId, _key) {}, // TODO(T2): mark done + unlock dependants
};
