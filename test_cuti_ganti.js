const item = { reason: 'Lengkapkan pakej website [CUTI_GANTI_DATA: [{"tarikhCuti":"2026-09-26","tarikhGanti":"2026-10-02","keterangan":"Lengkapkan pakej website","jamGanti":""}]]' };

const res = (() => {
  if (!item.reason) return "-";
  const prefix = "[CUTI_GANTI_DATA:";
  if (item.reason.includes(prefix)) {
    try {
      const startIndex = item.reason.indexOf(prefix);
      const endIndex = item.reason.lastIndexOf("]");
      const jsonStr = item.reason.substring(startIndex + prefix.length, endIndex);
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data) && data.length > 0) {
        let text = item.reason.substring(0, startIndex).trim();
        const details = data.map(d => d.keterangan || "-").filter(Boolean).join(", ");
        return "Replacement Leave (" + details + ")" + (text ? " - " + text : "");
      }
    } catch (e) {
      return "ERROR: " + e.message;
    }
  }
  return item.reason;
})();

console.log(res);