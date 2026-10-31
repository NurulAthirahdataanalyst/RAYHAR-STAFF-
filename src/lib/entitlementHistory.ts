// ─── Types ────────────────────────────────────────────────────────────────────
export type ActionType =
  | 'Initial Allocation'
  | 'Carry Forward'
  | 'Manual Adjustment'
  | 'Additional Allocation'
  | 'Deduction'
  | 'Rollback'
  | 'Special Leave'
  | 'Maternity Leave'
  | 'OT Conversion'
  | 'Policy Update';

export interface EntitlementHistoryLog {
  history_id: string;
  reference_id: string;
  date: string;
  time: string;
  timestamp: string;
  created_at: string;
  employee_id: string;
  employee_name: string;
  branch: string;
  department: string;
  leave_type: string;
  action: string;
  action_type: ActionType;
  previous_balance: number;
  adjustment: number;
  new_balance: number;
  reason: string;
  remarks?: string;
  performed_by: string;
  performed_role: string;
  source_module: string;
}

export const ENTITLEMENT_HISTORY_KEY = 'leave_entitlement_history_v2';

let _seq = Math.floor(Math.random() * 900);
function nextSeq(): string {
  _seq = (_seq + 1) % 999999;
  return String(_seq).padStart(6, '0');
}

export function buildHistoryLog(params: {
  employee_id: string;
  employee_name: string;
  branch?: string;
  department?: string;
  leave_type: string;
  action: string;
  action_type: ActionType;
  previous_balance: number;
  adjustment: number;
  new_balance: number;
  reason: string;
  remarks?: string;
  performed_by: string;
  performed_role?: string;
  source_module: string;
}): EntitlementHistoryLog {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const seq = nextSeq();
  const randRef = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    history_id: `LEH-${dateStr}-${seq}`,
    reference_id: `REF-${dateStr}-${randRef}`,
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true }),
    timestamp: now.toISOString(),
    created_at: now.toISOString(),
    branch: params.branch || 'HQ',
    department: params.department || '',
    performed_role: params.performed_role || 'HR Admin',
    remarks: params.remarks || '',
    ...params,
  };
}

export function appendHistoryLog(log: EntitlementHistoryLog): void {
  try {
    const saved = localStorage.getItem(ENTITLEMENT_HISTORY_KEY);
    const current: EntitlementHistoryLog[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem(ENTITLEMENT_HISTORY_KEY, JSON.stringify([log, ...current]));
    window.dispatchEvent(new CustomEvent('entitlementHistoryUpdated'));
    // backward compat
    const legacyLog = {
      date: log.date, action: log.action, reference: log.reference_id,
      before: log.previous_balance, after: log.new_balance,
      performedBy: log.performed_by, leave: log.leave_type,
      employee: log.employee_name, type: log.action_type,
    };
    const oldSaved = localStorage.getItem('leave_balance_history_logs');
    const oldLogs = oldSaved ? JSON.parse(oldSaved) : [];
    localStorage.setItem('leave_balance_history_logs', JSON.stringify([legacyLog, ...oldLogs]));
  } catch (e) {
    console.error('entitlementHistory: append failed', e);
  }
}

const RESET_FLAG = 'leh_reset_v3';

export function clearAllEntitlementHistory(): void {
  try {
    localStorage.removeItem(ENTITLEMENT_HISTORY_KEY);
    localStorage.removeItem('leave_balance_history_logs');
    localStorage.setItem(RESET_FLAG, 'true');
    window.dispatchEvent(new CustomEvent('entitlementHistoryUpdated'));
  } catch (e) {
    console.error('entitlementHistory: clear failed', e);
  }
}

export function getHistoryLogs(): EntitlementHistoryLog[] {
  try {
    // One-time automatic purge of all legacy/historical test records from prior testing
    if (!localStorage.getItem(RESET_FLAG)) {
      localStorage.removeItem(ENTITLEMENT_HISTORY_KEY);
      localStorage.removeItem('leave_balance_history_logs');
      localStorage.setItem(RESET_FLAG, 'true');
      return [];
    }

    const saved = localStorage.getItem(ENTITLEMENT_HISTORY_KEY);
    if (!saved) return [];
    return JSON.parse(saved) as EntitlementHistoryLog[];
  } catch {
    return [];
  }
}
