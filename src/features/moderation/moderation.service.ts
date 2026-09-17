import {
  blockLogSchema,
  reportLogSchema,
  reportReasonSchema,
  moderationTargetTypeSchema,
  type Block,
  type ModerationTargetType,
  type Report,
  type ReportReason,
} from "./moderation.schema";

const REPORTS_KEY = "yuniko.reports.v1";
const BLOCKS_KEY = "yuniko.blocks.v1";
const ACTOR_KEY = "yuniko.local-actor.v1";
const ACTOR_FALLBACK = "1";

function actorId(): string {
  if (typeof window === "undefined") return ACTOR_FALLBACK;
  return window.localStorage.getItem(ACTOR_KEY)?.trim() || ACTOR_FALLBACK;
}

function readReports(): Report[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    return raw ? reportLogSchema.parse(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeReports(reports: Report[]) {
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reportLogSchema.parse(reports).slice(-500)));
  window.dispatchEvent(new CustomEvent("yuniko:moderation-changed"));
}

function readBlocks(): Block[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BLOCKS_KEY);
    return raw ? blockLogSchema.parse(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeBlocks(blocks: Block[]) {
  window.localStorage.setItem(BLOCKS_KEY, JSON.stringify(blockLogSchema.parse(blocks).slice(-500)));
  window.dispatchEvent(new CustomEvent("yuniko:moderation-changed"));
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function getBlockedUserIds(): string[] {
  const currentActor = actorId();
  return readBlocks().filter((block) => block.blockerId === currentActor).map((block) => block.blockedId);
}

export function isUserBlocked(userId: string): boolean {
  return getBlockedUserIds().includes(userId);
}

export function blockUser(userId: string): Block {
  const currentActor = actorId();
  if (userId === currentActor) throw new Error("You cannot block yourself.");
  const blocks = readBlocks();
  const existing = blocks.find((block) => block.blockerId === currentActor && block.blockedId === userId);
  if (existing) return existing;
  const block = blockSchema.parse({ id: id("block"), blockerId: currentActor, blockedId: userId, createdAt: new Date().toISOString() });
  writeBlocks([...blocks, block]);
  return block;
}

export function unblockUser(userId: string): void {
  const currentActor = actorId();
  writeBlocks(readBlocks().filter((block) => !(block.blockerId === currentActor && block.blockedId === userId)));
}

export function reportTarget(targetType: ModerationTargetType, targetId: string, reason: ReportReason, description = ""): Report {
  const parsedType = moderationTargetTypeSchema.parse(targetType);
  const parsedReason = reportReasonSchema.parse(reason);
  const reports = readReports();
  const duplicate = reports.find((report) => report.reporterId === actorId() && report.targetType === parsedType && report.targetId === targetId && report.status === "pending");
  if (duplicate) return duplicate;
  const report = {
    id: id("report"),
    reporterId: actorId(),
    targetType: parsedType,
    targetId,
    reason: parsedReason,
    description: description.trim(),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  const parsed = reportLogSchema.element.parse(report);
  writeReports([...reports, parsed]);
  return parsed;
}

export function getMyReports(): Report[] {
  return readReports().filter((report) => report.reporterId === actorId());
}

export function subscribeToModerationChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener("yuniko:moderation-changed", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("yuniko:moderation-changed", onChange);
    window.removeEventListener("storage", onChange);
  };
}
