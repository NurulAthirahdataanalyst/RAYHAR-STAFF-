export const branchMap: Record<string, string> = {
  HQ: 'HQ',
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
  MZM: 'Marang',
  RMP: 'Rembau',
  SNS: 'Seremban',
  SPJ: 'Sungai Petani',
  TWU: 'Tawau',
  JTH: 'Jerteh',
};

export const formatBranchName = (branchCode: string): string => {
  if (!branchCode) return '-';
  const code = branchCode.toUpperCase().trim();
  if (code === 'HQ') return 'HQ';
  const name = branchMap[code];
  if (name) {
    return `${code} - ${name.toUpperCase()}`;
  }
  return code;
};
