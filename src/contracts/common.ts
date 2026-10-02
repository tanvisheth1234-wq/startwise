// src/contracts/common.ts   (SHARED, frozen)
export type Phase = "validate" | "prepare" | "register" | "pilot" | "launch" | "improve";
export type TaskStatus = "upcoming" | "pending" | "blocked" | "done";
export type VerifyStatus = "verified" | "check_locally";
export type SourceRef = { key: string; title: string; url: string; lastVerified: string | null; status: VerifyStatus };
