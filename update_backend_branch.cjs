const fs = require('fs');

function formatBranchName(branchCode) {
  const map = {
    HQ: 'HQ', AOR: 'Alor Setar', BTP: 'Batu Pahat', BTM: 'Bertam', CNH: 'Cheneh', DGN: 'Dungun', IPH: 'Ipoh', JHB: 'Johor Bahru', JB: 'Johor Bahru', KBG: 'Kubang Kerian', KBR: 'Kota Bharu', KKS: 'Kuala Kangsar', KMM: 'Kemaman', KTG: 'Kuala Terengganu', TGG: 'Kuala Terengganu', MJG: 'Manjung', MLK: 'Melaka', MZM: 'Marang', RMP: 'Rembau', SNS: 'Seremban', SPJ: 'Sungai Petani', TWU: 'Tawau', JTH: 'Jerteh',
  };
  if (!branchCode) return '-';
  const c = branchCode.toUpperCase().trim();
  if (c === 'HQ') return 'HQ';
  return map[c] ? `${c} - ${map[c].toUpperCase()}` : c;
}

function processServerFile(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/doc\.fontSize\([0-9]+\)\.font\("Helvetica-Bold"\)\.fillColor\("#111111"\)\.text\(employeeBranch\.toUpperCase\(\), rightCol, 116\);/g, (match) => {
    return 'const fb = (() => { const c = employeeBranch.toUpperCase().trim(); if (c === "HQ") return "HQ"; const map = {HQ: "HQ", AOR: "Alor Setar", BTP: "Batu Pahat", BTM: "Bertam", CNH: "Cheneh", DGN: "Dungun", IPH: "Ipoh", JHB: "Johor Bahru", JB: "Johor Bahru", KBG: "Kubang Kerian", KBR: "Kota Bharu", KKS: "Kuala Kangsar", KMM: "Kemaman", KTG: "Kuala Terengganu", TGG: "Kuala Terengganu", MJG: "Manjung", MLK: "Melaka", MZM: "Marang", RMP: "Rembau", SNS: "Seremban", SPJ: "Sungai Petani", TWU: "Tawau", JTH: "Jerteh"}; return map[c] ? c + " - " + map[c].toUpperCase() : c; })();\n      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111111").text(fb, rightCol, 116);';
  });
  fs.writeFileSync(file, c);
}

processServerFile('backend/server.js');
processServerFile('backend/generate_all_pdfs.js');
