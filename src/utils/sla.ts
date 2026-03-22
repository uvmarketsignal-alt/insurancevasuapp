export type SlaLevel = 'on_track' | 'warning' | 'breached';

export interface SlaResult {
  level: SlaLevel;
  remainingHours: number;
  label: string;
}

const HOUR = 1000 * 60 * 60;

export function approvalSla(createdAt: Date | string): SlaResult {
  // Approval SLA: 24h target, warning after 18h
  return genericSla(createdAt, 24, 18);
}

export function claimReviewSla(createdAt: Date | string): SlaResult {
  // Claim review SLA: 72h target, warning after 60h
  return genericSla(createdAt, 72, 60);
}

export function renewalSla(dueDate: Date | string): SlaResult {
  // Renewal SLA: countdown to due date (0h = breach), warning < 72h
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const remainingHours = Math.round((due - now) / HOUR);
  if (remainingHours < 0) {
    return { level: 'breached', remainingHours, label: `${Math.abs(remainingHours)}h overdue` };
  }
  if (remainingHours <= 72) {
    return { level: 'warning', remainingHours, label: `${remainingHours}h left` };
  }
  return { level: 'on_track', remainingHours, label: `${remainingHours}h left` };
}

function genericSla(createdAt: Date | string, targetHours: number, warningAfterHours: number): SlaResult {
  const created = new Date(createdAt).getTime();
  const elapsed = Math.round((Date.now() - created) / HOUR);
  const remaining = targetHours - elapsed;

  if (elapsed >= targetHours) {
    return { level: 'breached', remainingHours: remaining, label: `${Math.abs(remaining)}h overdue` };
  }
  if (elapsed >= warningAfterHours) {
    return { level: 'warning', remainingHours: remaining, label: `${remaining}h left` };
  }
  return { level: 'on_track', remainingHours: remaining, label: `${remaining}h left` };
}

export function slaClass(level: SlaLevel): string {
  if (level === 'breached') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-green-100 text-green-700 border-green-200';
}
