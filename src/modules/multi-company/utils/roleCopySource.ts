import { CompanyRole } from '../types/multiCompany.types';

const STORAGE_KEY = 'rayhar_role_copy_source_map';

export interface RoleCopySourceRecord {
  sourceCompanyId: number;
  sourceRoleId: string;
  sourceRoleName: string;
  updatedAt?: string;
}

function readStorageMap(): Record<string, RoleCopySourceRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorageMap(map: Record<string, RoleCopySourceRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveRoleCopySource(params: {
  roleId?: string | null;
  companyId?: number | null;
  roleName?: string | null;
  sourceCompanyId: number;
  sourceRoleId: string;
  sourceRoleName: string;
}): void {
  const { roleId, companyId, roleName, sourceCompanyId, sourceRoleId, sourceRoleName } = params;
  if (!sourceRoleId && !sourceRoleName) return;

  const map = readStorageMap();
  const record: RoleCopySourceRecord = {
    sourceCompanyId: Number(sourceCompanyId) || 1,
    sourceRoleId: String(sourceRoleId || ''),
    sourceRoleName: String(sourceRoleName || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  if (roleId) {
    map[`id:${String(roleId)}`] = record;
  }
  const cleanName = String(roleName || '').trim().toLowerCase();
  if (cleanName) {
    const cId = Number(companyId) || 1;
    map[`name:${cId}:${cleanName}`] = record;
    map[`global_name:${cleanName}`] = record;
  }

  writeStorageMap(map);
}

function inferExpectedScope(role: any): string {
  if (!role) return 'Own Data Only';
  const s = String(role.scope_type || '').trim();
  if (
    s === 'Own Data Only' ||
    s === 'Branch Data Only' ||
    s === 'Department Data Only' ||
    s === 'Company Staff Data' ||
    s === 'Parent Group Data'
  ) {
    return s;
  }
  const lower = String(role.name || '').toLowerCase();
  if (lower.includes('employee') || lower.includes('driver') || lower.includes('staff')) {
    return 'Own Data Only';
  }
  if (
    lower.includes('branch leader') ||
    lower.includes('branch manager') ||
    lower.includes('head of department') ||
    lower.includes('hod') ||
    lower.includes('supervisor')
  ) {
    return 'Branch Data Only';
  }
  if (
    lower.includes('hr admin') ||
    lower.includes('operation manager') ||
    lower.includes('finance manager')
  ) {
    return 'Company Staff Data';
  }
  if (
    lower.includes('managing director') ||
    lower.includes('super admin') ||
    lower.includes('director')
  ) {
    return 'Parent Group Data';
  }
  return s === 'Parent Group Access' ? 'Parent Group Data' : 'Company Staff Data';
}

export function resolveRoleCopySource(params: {
  role: Partial<CompanyRole> & { id?: string; name?: string; company_id?: number | null };
  mainCompanyRoles?: any[];
  allCompaniesRoles?: Record<number, any[]>;
  enabledPermissionKeys?: Set<string>;
}): RoleCopySourceRecord | null {
  const {
    role,
    mainCompanyRoles = [],
    allCompaniesRoles = {},
    enabledPermissionKeys,
  } = params;

  if (!role) return null;

  const getPoolForCompany = (cId: number): any[] => {
    const fromMap = allCompaniesRoles[cId] || [];
    if (cId === 1) {
      const combined = [...fromMap];
      const seenIds = new Set(combined.map((r: any) => String(r.id)));
      const seenNames = new Set(combined.map((r: any) => String(r.name || '').toLowerCase()));
      for (const mr of mainCompanyRoles) {
        if (
          mr &&
          !seenIds.has(String(mr.id)) &&
          !seenNames.has(String(mr.name || '').toLowerCase())
        ) {
          combined.push(mr);
        }
      }
      return combined;
    }
    return fromMap;
  };

  const findRoleInPools = (
    targetCompanyId: number,
    roleId?: string | null,
    roleName?: string | null
  ): { companyId: number; matched: any } | null => {
    const primaryPool = getPoolForCompany(targetCompanyId);
    const cleanId = String(roleId || '').trim();
    const cleanName = String(roleName || '').trim().toLowerCase();

    const matchInList = (list: any[]) =>
      list.find(
        (r: any) =>
          (cleanId && String(r.id) === cleanId) ||
          (cleanName && String(r.name || '').trim().toLowerCase() === cleanName) ||
          (cleanId && String(r.name || '').trim().toLowerCase() === cleanId.toLowerCase())
      );

    const direct = matchInList(primaryPool);
    if (direct) {
      return { companyId: targetCompanyId, matched: direct };
    }

    // Also check Main Company pool
    const mainMatch = matchInList(getPoolForCompany(1));
    if (mainMatch) {
      return { companyId: 1, matched: mainMatch };
    }

    // Check any other company pools
    for (const [cidStr, list] of Object.entries(allCompaniesRoles)) {
      const found = matchInList(list || []);
      if (found) {
        return { companyId: Number(cidStr) || 1, matched: found };
      }
    }

    return null;
  };

  // 1. Check localStorage persistence first
  const map = readStorageMap();
  const roleIdKey = role.id ? `id:${String(role.id)}` : '';
  const cleanRoleName = String(role.name || '').trim().toLowerCase();
  const roleCompanyId = Number(role.company_id) || 1;
  const nameKey = cleanRoleName ? `name:${roleCompanyId}:${cleanRoleName}` : '';
  const globalNameKey = cleanRoleName ? `global_name:${cleanRoleName}` : '';

  const stored =
    (roleIdKey && map[roleIdKey]) ||
    (nameKey && map[nameKey]) ||
    (globalNameKey && map[globalNameKey]) ||
    null;

  if (stored && (stored.sourceRoleId || stored.sourceRoleName)) {
    if (stored.sourceRoleId === 'blank') {
      return {
        sourceCompanyId: stored.sourceCompanyId || 1,
        sourceRoleId: 'blank',
        sourceRoleName: 'blank',
      };
    }
    const resolved = findRoleInPools(
      stored.sourceCompanyId || 1,
      stored.sourceRoleId,
      stored.sourceRoleName
    );
    if (resolved) {
      return {
        sourceCompanyId: resolved.companyId,
        sourceRoleId: String(resolved.matched.id),
        sourceRoleName: String(resolved.matched.name),
      };
    }
    return stored;
  }

  // 2. Check database columns on role object
  if (role.copied_from_role_id || role.copied_from_role_name) {
    const dbCompanyId = Number(role.copied_from_company_id) || 1;
    const resolved = findRoleInPools(
      dbCompanyId,
      role.copied_from_role_id,
      role.copied_from_role_name
    );
    if (resolved) {
      return {
        sourceCompanyId: resolved.companyId,
        sourceRoleId: String(resolved.matched.id),
        sourceRoleName: String(resolved.matched.name),
      };
    }
    return {
      sourceCompanyId: dbCompanyId,
      sourceRoleId: String(role.copied_from_role_id || role.copied_from_role_name || ''),
      sourceRoleName: String(role.copied_from_role_name || role.copied_from_role_id || ''),
    };
  }

  // 3. Smart Permission + Scope + Role Type Matching against Main Company template roles
  const targetKeys = Array.isArray(role.permission_keys) ? role.permission_keys : [];
  const mainPool = getPoolForCompany(1);

  if (targetKeys.length > 0 && mainPool.length > 0) {
    const targetSet = new Set(targetKeys);
    const targetLevels = role.permission_levels || {};
    const targetScope = inferExpectedScope(role);
    const targetNameLower = String(role.name || '').toLowerCase();
    const targetRoleType = String(role.role_type || '').toLowerCase();

    let bestCandidate: any = null;
    let bestScore = -1;

    for (const candidate of mainPool) {
      if (!candidate || String(candidate.id) === String(role.id)) continue;
      const rawCandidateKeys: string[] = Array.isArray(candidate.permission_keys)
        ? candidate.permission_keys
        : [];
      const filteredCandidateKeys =
        enabledPermissionKeys && enabledPermissionKeys.size > 0
          ? rawCandidateKeys.filter((k) => enabledPermissionKeys.has(k))
          : rawCandidateKeys;

      if (filteredCandidateKeys.length !== targetSet.size) continue;
      const allKeysMatch = filteredCandidateKeys.every((k) => targetSet.has(k));
      if (!allKeysMatch) continue;

      // Candidate has the exact same set of permissions! Score tie-breakers:
      let score = 100;
      const candLevels = candidate.permission_levels || {};
      const allLevelsMatch = filteredCandidateKeys.every(
        (k) => (candLevels[k] || 'edit') === (targetLevels[k] || 'edit')
      );
      if (allLevelsMatch) score += 25;

      const candScope = inferExpectedScope(candidate);
      if (candScope === targetScope) score += 30;

      const candNameLower = String(candidate.name || '').toLowerCase();
      if (candNameLower === targetNameLower) {
        score += 50;
      } else {
        if (
          (targetRoleType.includes('operational') ||
            targetNameLower.includes('supervisor') ||
            targetNameLower.includes('branch') ||
            targetNameLower.includes('leader') ||
            targetNameLower.includes('fleet')) &&
          candNameLower.includes('branch leader')
        ) {
          score += 40;
        }
        if (
          (targetNameLower.includes('department') || targetNameLower.includes('hod')) &&
          (candNameLower.includes('head of department') || candNameLower.includes('hod'))
        ) {
          score += 40;
        }
        if (
          (targetRoleType.includes('employee') ||
            targetNameLower.includes('employee') ||
            targetNameLower.includes('staff') ||
            targetNameLower.includes('driver')) &&
          candNameLower.includes('employee')
        ) {
          score += 40;
        }
        if (
          (targetNameLower.includes('hr') || targetNameLower.includes('admin')) &&
          candNameLower.includes('hr admin')
        ) {
          score += 40;
        }
        if (
          (targetNameLower.includes('operation') || targetNameLower.includes('finance')) &&
          candNameLower.includes('operation manager')
        ) {
          score += 40;
        }
        if (
          targetNameLower.includes('director') &&
          candNameLower.includes('managing director')
        ) {
          score += 40;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      return {
        sourceCompanyId: 1,
        sourceRoleId: String(bestCandidate.id),
        sourceRoleName: String(bestCandidate.name),
      };
    }
  }

  return null;
}
