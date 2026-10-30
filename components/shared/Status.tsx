import type { ThreadKind, ThreadStatus } from "@/lib/types";

export const STATUS_LABEL: Record<ThreadStatus, string> = {
  moving: "Moving",
  stuck: "Stuck",
  waiting: "Waiting",
  done: "Done",
  paused: "Paused",
};

export const KIND_LABEL: Record<ThreadKind, string> = {
  project: "Project",
  task: "Task",
  goal: "Goal",
  habit: "Habit",
  person: "Person",
  event: "Event",
  health: "Health",
  learning: "Learning",
  other: "Thread",
};

/** A thread's status as a coloured dot and a word. */
export function Status({ status, className = "" }: { status: ThreadStatus; className?: string }) {
  return (
    <span className={`status-${status} inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold ${className}`}>
      <span className="pip" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
