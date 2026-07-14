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

function mapLegacyType(type: string): ActionType {
  if (!type) return 'Manual Adjustment';
  const t = type.toLowerCase();
  if (t.includes('carry') || t.includes('forward')) return 'Carry Forward';
  if (t.includes('additional')) return 'Additional Allocation';
  if (t.includes('deduct')) return 'Deduction';
  if (t.includes('rollback') || t.includes('reversal')) return 'Rollback';
  if (t.includes('special') || t.includes('credit')) return 'Special Leave';
  if (t.includes('maternity') || t.includes('statutory')) return 'Maternity Leave';
  if (t.includes('ot') || t.includes('overtime')) return 'OT Conversion';
  if (t.includes('allocation') || t.includes('base')) return 'Initial Allocation';
  return 'Manual Adjustment';
}

export function getHistoryLogs(): EntitlementHistoryLog[] {
  try {
    const saved = localStorage.getItem(ENTITLEMENT_HISTORY_KEY);
    if (saved) return JSON.parse(saved) as EntitlementHistoryLog[];
    const legacy = localStorage.getItem('leave_balance_history_logs');
    if (!legacy) return [];
    const oldLogs: any[] = JSON.parse(legacy);
    const migrated: EntitlementHistoryLog[] = oldLogs.map((l, i) => ({
      history_id: `LEH-LEGACY-${String(i).padStart(6, '0')}`,
      reference_id: l.reference || `REF-LEGACY-${i}`,
      date: l.date || new Date().toISOString().split('T')[0],
      time: '00:00 AM',
      timestamp: l.date ? new Date(l.date + 'T00:00:00').toISOString() : new Date().toISOString(),
      created_at: l.date ? new Date(l.date + 'T00:00:00').toISOString() : new Date().toISOString(),
      employee_id: '',
      employee_name: l.employee || '',
      branch: 'HQ',
      department: '',
      leave_type: l.leave || '',
      action: l.action || '',
      action_type: mapLegacyType(l.type || l.action),
      previous_balance: l.before ?? 0,
      adjustment: (l.after ?? 0) - (l.before ?? 0),
      new_balance: l.after ?? 0,
      reason: l.reference || '',
      remarks: '',
      performed_by: l.performedBy || 'System',
      performed_role: 'HR Admin',
      source_module: 'Legacy',
    }));
    localStorage.setItem(ENTITLEMENT_HISTORY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}
