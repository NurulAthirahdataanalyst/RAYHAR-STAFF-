export const branchMap: Record<string, string> = {
  HQ: 'Rayhar HQ',
  AOR: 'Alor Setar',
  BTP: 'Batu Pahat',
  BTM: 'Bertam',
  CNH: 'Cheneh',
  DGN: 'Dungun',
  IPH: 'Ipoh',
  JHB: 'Johor Bahru',
  JB: 'Johor Bahru',
  KBG: 'Kubang Kerian',
  KBR: 'Kota Bharu',
  KKS: 'Kuala Kangsar',
  KMM: 'Kemaman',
  KTG: 'Kuala Terengganu',
  TGG: 'Kuala Terengganu',
  MJG: 'Manjung',
  MLK: 'Melaka',
  MZM: 'Muadzam Shah',
  RMP: 'Rompin',
  SNS: 'Seremban',
  SPJ: 'Sungai Petani',
  TWU: 'Tawau',
  JTH: 'Jertih',
  RAYRENT: 'Rayhar Rent'
};

/**
 * Converts any string into Proper Case (Title Case), preserving acronyms like HQ.
 * e.g. "rayhar rent" -> "Rayhar Rent"
 * e.g. "alor setar" -> "Alor Setar"
 * e.g. "rayhar hq" -> "Rayhar HQ"
 */
export const toProperCase = (str: string | undefined | null): string => {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (!trimmed) return '';

  // Acronym preserves
  if (trimmed.toUpperCase() === 'HQ') return 'HQ';
  if (trimmed.toUpperCase() === 'JB') return 'JB';
  if (trimmed.toUpperCase() === 'KL') return 'KL';

  return trimmed
    .split(/\s+/)
    .map(word => {
      const upper = word.toUpperCase();
      if (upper === 'HQ') return 'HQ';
      if (upper === 'KL') return 'KL';
      if (upper === 'JB') return 'JB';
      if (upper === 'SDN' || upper === 'SDN.') return 'Sdn';
      if (upper === 'BHD' || upper === 'BHD.') return 'Bhd';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Formats branch display with code and name in Proper Case.
 */
export const formatBranchName = (branchCode: string): string => {
  if (!branchCode) return '-';
  const code = branchCode.toUpperCase().trim();
  if (code === 'HQ') return 'HQ';
  const name = branchMap[code];
  if (name) {
    return `${code} - ${toProperCase(name)}`;
  }
  return toProperCase(branchCode);
};

/**
 * Returns the branch's clean proper-case name.
 */
export const formatBranchDisplayName = (branch: { code?: string; name?: string } | string): string => {
  if (!branch) return '';
  if (typeof branch === 'string') {
    const code = branch.toUpperCase().trim();
    if (branchMap[code]) return toProperCase(branchMap[code]);
    return toProperCase(branch);
  }
  if (branch.name && branch.name.trim()) {
    return toProperCase(branch.name);
  }
  if (branch.code && branchMap[branch.code.toUpperCase().trim()]) {
    return toProperCase(branchMap[branch.code.toUpperCase().trim()]);
  }
  return toProperCase(branch.code || '');
};
