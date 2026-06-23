/** Shared types for the Environment Doctor (PLAN §6.1). */

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface DoctorFix {
  kind: 'copyEnvExample' | 'openUrl' | 'runCommand';
  label: string;
  url?: string;
  command?: string;
  args?: Record<string, unknown>;
}

export interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
  fix?: DoctorFix;
}

export interface CheckGroup {
  id: string;
  label: string;
  items: CheckItem[];
}

export interface DoctorReport {
  groups: CheckGroup[];
  summary: { ok: number; warn: number; fail: number };
  generatedAt: string;
  hasWorkspace: boolean;
}
