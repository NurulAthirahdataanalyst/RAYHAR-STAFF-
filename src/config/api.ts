export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.startsWith("192.168."))
    ? "http://localhost:5000"
    : "https://rayhar-staff.onrender.com");

export const STORAGE_ACTIVE_COMPANY_KEY = 'rayhar_active_company_id';

export function getActiveCompanyId(): string {
  if (typeof window === 'undefined') return '1';
  return (
    sessionStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) ||
    localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) ||
    '1'
  );
}

// Global fetch interceptor to automatically attach X-Company-Id and company_id query param
if (typeof window !== 'undefined' && !((window as any).__rayhar_fetch_interceptor_installed)) {
  (window as any).__rayhar_fetch_interceptor_installed = true;
  const originalFetch = window.fetch.bind(window);

  // Cache of company_id -> { annual: number, sick: number } from /api/multi-company/companies/:id/leave-settings
  const companyLeavePolicyCache = new Map<number, { annual: number; sick: number }>();
  const pendingPolicyFetches = new Map<number, Promise<{ annual: number; sick: number } | null>>();
  const userCompanyMap = new Map<string, number>();

  const parseLeaveTypesToPolicy = (leaveTypes: any[]): { annual: number; sick: number } | null => {
    if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) return null;
    const annualRow = leaveTypes.find((l: any) => l.leave_type === 'Annual Leave');
    const sickRow = leaveTypes.find((l: any) => l.leave_type === 'Sick Leave');
    const annual = annualRow?.default_entitlement_days !== undefined && annualRow?.default_entitlement_days !== null
      ? Number(annualRow.default_entitlement_days)
      : 14;
    const sick = sickRow?.default_entitlement_days !== undefined && sickRow?.default_entitlement_days !== null
      ? Number(sickRow.default_entitlement_days)
      : 14;
    return { annual, sick };
  };

  const ensureCompanyLeavePolicy = async (companyId: number): Promise<{ annual: number; sick: number } | null> => {
    const cid = Number(companyId) || 1;
    if (companyLeavePolicyCache.has(cid)) {
      return companyLeavePolicyCache.get(cid)!;
    }
    if (pendingPolicyFetches.has(cid)) {
      return pendingPolicyFetches.get(cid)!;
    }
    const p = (async () => {
      try {
        const res = await originalFetch(`${API_BASE_URL}/api/multi-company/companies/${cid}/leave-settings`);
        if (!res.ok) return null;
        const data = await res.json();
        const policy = parseLeaveTypesToPolicy(data?.leave_types);
        if (policy) {
          companyLeavePolicyCache.set(cid, policy);
        }
        return policy;
      } catch (_) {
        return null;
      } finally {
        pendingPolicyFetches.delete(cid);
      }
    })();
    pendingPolicyFetches.set(cid, p);
    return p;
  };

  const inferEmployeeCompanyId = (emp: any, fallbackCid: number): number => {
    if (!emp || typeof emp !== 'object') return fallbackCid;
    if (Array.isArray(emp.assigned_companies) && emp.assigned_companies.length > 0) {
      const sub = emp.assigned_companies.find((c: any) => Number(c.company_id) !== 1);
      const def = emp.assigned_companies.find((c: any) => c.is_default);
      const chosen = sub || def || emp.assigned_companies[0];
      if (chosen?.company_id) return Number(chosen.company_id);
    }
    const uid = String(emp.user_id || emp.id || '').trim().toUpperCase();
    if (uid && userCompanyMap.has(uid)) {
      const mapped = userCompanyMap.get(uid)!;
      if (mapped !== 1) return mapped;
    }
    const br = String(emp.branch || '').trim().toUpperCase();
    if (br === 'RAYRENT') return 2;
    if (br.startsWith('RV')) return 3;
    if (emp.company_id && Number(emp.company_id) > 1) return Number(emp.company_id);
    if (fallbackCid && fallbackCid > 1 && emp.belongs_to_company !== false) return fallbackCid;
    if (emp.company_id && Number(emp.company_id) > 0) return Number(emp.company_id);
    if (uid && userCompanyMap.has(uid)) return userCompanyMap.get(uid)!;
    return fallbackCid;
  };

  window.addEventListener('rayhar_leave_refresh', (e: any) => {
    const detail = e?.detail;
    if (detail?.companyId) {
      companyLeavePolicyCache.set(Number(detail.companyId), {
        annual: Number(detail.annualDays ?? 14),
        sick: Number(detail.sickDays ?? 14),
      });
    } else {
      companyLeavePolicyCache.clear();
    }
  });

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // Only intercept requests directed to our backend API endpoints
      if (url && (url.includes('/api/') || (API_BASE_URL && url.startsWith(API_BASE_URL)))) {
        const activeCompanyId = getActiveCompanyId();

        init = init ? { ...init } : {};
        const headers = new Headers(init.headers || {});

        // Check if URL specifies explicit company_id query parameter
        let targetCompanyId = activeCompanyId;
        try {
          const urlObj = new URL(url, window.location.origin);
          const qCid = urlObj.searchParams.get('company_id') || urlObj.searchParams.get('companyId');
          if (qCid) {
            targetCompanyId = qCid;
          }
        } catch (_) {}

        if (!headers.has('X-Company-Id')) {
          headers.set('X-Company-Id', targetCompanyId);
        }

        // Attach Operator identity for system audit logging
        if (!headers.has('X-Operator-Name')) {
          try {
            const rawUser = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              const opName = u.full_name || u.name || sessionStorage.getItem('presence_cached_name') || 'HR Admin';
              const opRole = u.role || sessionStorage.getItem('presence_cached_role') || 'hr_admin';
              const opId = String(u.id || u.user_id || 'system');
              const opScope = sessionStorage.getItem('presence_cached_scope_type') || u.scope_type || '';
              const opDept = sessionStorage.getItem('presence_cached_department') || u.department || '';
              const opBranch = sessionStorage.getItem('presence_cached_branch') || u.branch || '';
              headers.set('X-Operator-Name', encodeURIComponent(opName));
              headers.set('X-Operator-Role', encodeURIComponent(opRole));
              headers.set('X-Operator-Id', opId);
              if (opScope && !headers.has('X-User-Scope')) headers.set('X-User-Scope', encodeURIComponent(opScope));
              if (opDept && !headers.has('X-User-Department')) headers.set('X-User-Department', encodeURIComponent(opDept));
              if (opBranch && !headers.has('X-User-Branch')) headers.set('X-User-Branch', encodeURIComponent(opBranch));
            }
          } catch (_) {}
        }

        init.headers = headers;

        // For GET requests that do not already have company_id or companyId, append it
        const method = (init.method || 'GET').toUpperCase();
        if (method === 'GET' && !url.includes('company_id=') && !url.includes('companyId=')) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}company_id=${encodeURIComponent(targetCompanyId)}`;
        }

        const response = await originalFetch(url, init);

        // Keep leave_settings cache updated when leave-settings endpoint is called
        const leaveSettingsMatch = url.match(/\/api\/multi-company\/companies\/(\d+)\/leave-settings/);
        if (leaveSettingsMatch) {
          const cid = Number(leaveSettingsMatch[1]);
          response.clone().json().then((data) => {
            const policy = parseLeaveTypesToPolicy(data?.leave_types);
            if (policy) companyLeavePolicyCache.set(cid, policy);
          }).catch(() => {});
          return response;
        }

        // Normalize employee leave entitlements against company leave_settings policy
        const needsEntitlementSync =
          method === 'GET' &&
          response.ok &&
          (url.includes('/api/employees') ||
            url.includes('/api/user-details/') ||
            url.includes('/api/leave-entitlements') ||
            url.includes('/api/reports/workforce-leave-balance') ||
            url.includes('/api/leave-requests') ||
            url.includes('/api/branch-employees') ||
            url.includes('/api/dashboard-stats'));

        if (needsEntitlementSync) {
          try {
            const cloned = response.clone();
            const data = await cloned.json();
            const fallbackCid = Number(targetCompanyId) || 1;

            // 1. /api/user-details/:identifier
            if (url.includes('/api/user-details/') && data?.success && data?.profile) {
              const uid = String(data.profile.user_id || '').trim().toUpperCase();
              let empCid = inferEmployeeCompanyId(data.profile, Number(data.company_id) || fallbackCid);
              if (uid && empCid === 1 && !userCompanyMap.has(uid)) {
                try {
                  const ucRes = await originalFetch(`${API_BASE_URL}/api/multi-company/employees/${encodeURIComponent(uid)}/companies`);
                  if (ucRes.ok) {
                    const ucData = await ucRes.json();
                    if (Array.isArray(ucData?.user_companies) && ucData.user_companies.length > 0) {
                      const sub = ucData.user_companies.find((c: any) => Number(c.company_id) !== 1);
                      const def = ucData.user_companies.find((c: any) => c.is_default);
                      const chosen = sub || def || ucData.user_companies[0];
                      if (chosen?.company_id) {
                        empCid = Number(chosen.company_id);
                      }
                    }
                  }
                } catch (_) {}
              }
              if (uid && empCid) userCompanyMap.set(uid, empCid);
              const policy = await ensureCompanyLeavePolicy(empCid);
              if (policy && data.profile.belongs_to_company !== false) {
                data.profile.annual_leave_entitlement = policy.annual;
                data.profile.medical_leave_entitlement = policy.sick;
              }
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }

            // 2. /api/employees/:userId/analytics
            const analyticsMatch = url.match(/\/api\/employees\/([^/?#]+)\/analytics/);
            if (analyticsMatch && data?.success && data?.analytics?.leave) {
              const uid = decodeURIComponent(analyticsMatch[1]).trim().toUpperCase();
              let empCid = userCompanyMap.get(uid) || fallbackCid;
              if (!userCompanyMap.has(uid)) {
                try {
                  const uRes = await originalFetch(`${API_BASE_URL}/api/user-details/${encodeURIComponent(uid)}?company_id=${fallbackCid}`);
                  const uData = await uRes.json();
                  if (uData?.profile) {
                    empCid = inferEmployeeCompanyId(uData.profile, Number(uData.company_id) || fallbackCid);
                    userCompanyMap.set(uid, empCid);
                  }
                } catch (_) {}
              }
              const policy = await ensureCompanyLeavePolicy(empCid);
              if (policy) {
                const lv = data.analytics.leave;
                const annualAdj = Number(lv.annual?.adjustment || 0);
                const annualTaken = Number(lv.annual?.taken ?? lv.used ?? 0);
                const totalAnnual = Math.round(Math.max(0, policy.annual + annualAdj) * 10) / 10;
                const remAnnual = Math.round(Math.max(0, totalAnnual - annualTaken) * 10) / 10;

                const sickAdj = Number(lv.sick?.adjustment || 0);
                const sickTaken = Number(lv.sick?.taken || 0);
                const totalSick = Math.round(Math.max(0, policy.sick + sickAdj) * 10) / 10;
                const remSick = Math.round(Math.max(0, totalSick - sickTaken) * 10) / 10;

                if (lv.annual) {
                  lv.annual.entitlement = totalAnnual;
                  lv.annual.balance = remAnnual;
                }
                if (lv.sick) {
                  lv.sick.entitlement = totalSick;
                  lv.sick.balance = remSick;
                }
                lv.entitlement = totalAnnual;
                lv.remaining = remAnnual;
                lv.utilizationRate = totalAnnual > 0 ? Math.round((annualTaken / totalAnnual) * 100) : 0;
              }
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }

            // 3. /api/employees or /api/branch-employees
            if ((url.includes('/api/employees') || url.includes('/api/branch-employees')) && data?.success && Array.isArray(data?.employees)) {
              const companyIds = new Set<number>([fallbackCid]);
              for (const emp of data.employees) {
                const cid = inferEmployeeCompanyId(emp, fallbackCid);
                companyIds.add(cid);
                const uid = String(emp.user_id || emp.id || '').trim().toUpperCase();
                if (uid) userCompanyMap.set(uid, cid);
              }
              await Promise.all(Array.from(companyIds).map((cid) => ensureCompanyLeavePolicy(cid)));
              for (const emp of data.employees) {
                const cid = inferEmployeeCompanyId(emp, fallbackCid);
                const policy = companyLeavePolicyCache.get(cid);
                if (policy) {
                  const annualAdj = Number(emp.annual_adj ?? emp.total_adjustment ?? 0);
                  const medicalAdj = Number(emp.medical_adj ?? 0);
                  const annualUsed = Number(emp.annual_days_used ?? 0);
                  const medicalUsed = Number(emp.medical_days_used ?? 0);
                  emp.annual_leave_entitlement = policy.annual;
                  emp.medical_leave_entitlement = policy.sick;
                  emp.annual_leave_balance = Math.round(Math.max(0, policy.annual + annualAdj - annualUsed) * 10) / 10;
                  if (emp.medical_leave_balance !== undefined) {
                    emp.medical_leave_balance = Math.round(Math.max(0, policy.sick + medicalAdj - medicalUsed) * 10) / 10;
                  }
                }
              }
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }

            // 4. /api/leave-entitlements
            if (url.includes('/api/leave-entitlements') && data?.success && Array.isArray(data?.entitlements)) {
              const companyIds = new Set<number>([fallbackCid]);
              for (const row of data.entitlements) {
                companyIds.add(inferEmployeeCompanyId(row, fallbackCid));
              }
              await Promise.all(Array.from(companyIds).map((cid) => ensureCompanyLeavePolicy(cid)));
              for (const row of data.entitlements) {
                const cid = inferEmployeeCompanyId(row, fallbackCid);
                const policy = companyLeavePolicyCache.get(cid);
                if (policy) {
                  const used = Number(row.annual_days_used || 0);
                  const oldBase = Number(row.annual_leave_entitlement || 14);
                  const adj = Number(row.total_entitled ?? oldBase) - oldBase;
                  const newEntitled = Math.round(Math.max(0, policy.annual + adj) * 10) / 10;
                  row.annual_leave_entitlement = policy.annual;
                  row.total_entitled = newEntitled;
                  row.balance = Math.round(Math.max(0, newEntitled - used) * 10) / 10;
                }
              }
              if (Array.isArray(data.data)) {
                data.data = data.entitlements;
              }
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }

            // 5. /api/reports/workforce-leave-balance
            if (url.includes('/api/reports/workforce-leave-balance') && data?.success && Array.isArray(data?.employees)) {
              const companyIds = new Set<number>([fallbackCid]);
              for (const emp of data.employees) {
                companyIds.add(inferEmployeeCompanyId(emp, fallbackCid));
              }
              await Promise.all(Array.from(companyIds).map((cid) => ensureCompanyLeavePolicy(cid)));
              let sumEntitlement = 0;
              let sumTaken = 0;
              let sumBalance = 0;
              for (const emp of data.employees) {
                const cid = inferEmployeeCompanyId(emp, fallbackCid);
                const policy = companyLeavePolicyCache.get(cid);
                if (policy && emp.annual && emp.medical) {
                  const annualTaken = Number(emp.annual.taken || 0);
                  const annualAdj = emp.annual.entitlement === 14 && policy.annual !== 14 ? 0 : (Number(emp.annual.entitlement || policy.annual) - policy.annual);
                  const newAnnualEnt = Math.round(Math.max(0, policy.annual + annualAdj) * 10) / 10;
                  const newAnnualRem = Math.round(Math.max(0, newAnnualEnt - annualTaken) * 10) / 10;

                  const medTaken = Number(emp.medical.taken || 0);
                  const medAdj = emp.medical.entitlement === 14 && policy.sick !== 14 ? 0 : (Number(emp.medical.entitlement || policy.sick) - policy.sick);
                  const newMedEnt = Math.round(Math.max(0, policy.sick + medAdj) * 10) / 10;
                  const newMedRem = Math.round(Math.max(0, newMedEnt - medTaken) * 10) / 10;

                  emp.annual.entitlement = newAnnualEnt;
                  emp.annual.remaining = newAnnualRem;
                  emp.medical.entitlement = newMedEnt;
                  emp.medical.remaining = newMedRem;

                  const replEnt = Number(emp.replacement?.entitlement || 0);
                  const replRem = Number(emp.replacement?.remaining || 0);
                  emp.totalEntitlement = Math.round((newAnnualEnt + newMedEnt + replEnt) * 10) / 10;
                  emp.totalBalance = Math.round((newAnnualRem + newMedRem + replRem) * 10) / 10;
                }
                sumEntitlement = Math.round((sumEntitlement + Number(emp.annual?.entitlement || 0)) * 10) / 10;
                sumTaken = Math.round((sumTaken + Number(emp.annual?.taken || 0)) * 10) / 10;
                sumBalance = Math.round((sumBalance + Number(emp.annual?.remaining || 0)) * 10) / 10;
              }
              if (data.summary) {
                data.summary.totalEntitlement = sumEntitlement;
                data.summary.totalTaken = sumTaken;
                data.summary.totalBalance = sumBalance;
              }
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }
          } catch (_) {
            // Fall back to original response if JSON parsing fails
          }
        }

        return response;
      }
    } catch (e) {
      console.warn('Fetch interceptor error:', e);
    }

    return originalFetch(input, init);
  };

  // Also intercept EventSource (SSE) so /api/ streams automatically carry company_id
  if (typeof window.EventSource !== 'undefined') {
    const OriginalEventSource = window.EventSource;
    const PatchedEventSource = function (url: string | URL, eventSourceInitDict?: EventSourceInit) {
      let urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr && (urlStr.includes('/api/') || (API_BASE_URL && urlStr.startsWith(API_BASE_URL)))) {
        if (!urlStr.includes('company_id=') && !urlStr.includes('companyId=')) {
          const activeCompanyId = getActiveCompanyId();
          const separator = urlStr.includes('?') ? '&' : '?';
          urlStr = `${urlStr}${separator}company_id=${encodeURIComponent(activeCompanyId)}`;
        }
      }
      return new OriginalEventSource(urlStr, eventSourceInitDict);
    } as unknown as typeof EventSource;
    PatchedEventSource.prototype = OriginalEventSource.prototype;
    (PatchedEventSource as any).CONNECTING = OriginalEventSource.CONNECTING;
    (PatchedEventSource as any).OPEN = OriginalEventSource.OPEN;
    (PatchedEventSource as any).CLOSED = OriginalEventSource.CLOSED;
    window.EventSource = PatchedEventSource;
  }
}
