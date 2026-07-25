import os

filepath = r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveAdmin.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state for bakiLayak
state_str = "  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);"
new_state_str = state_str + "\n  const [bakiLayak, setBakiLayak] = useState<number | string>('-');"
content = content.replace(state_str, new_state_str)

# 2. Add useEffect to fetch bakiLayak when selectedRequest changes
use_effect_str = """
  useEffect(() => {
    if (selectedRequest) {
      setBakiLayak("-");
      const userId = (selectedRequest as any).userId || (selectedRequest as any).user_id || "";
      if (userId) {
        fetch(`${API_BASE_URL}/api/leave-balance/${userId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.balances) {
              const typeUpper = selectedRequest.type.toUpperCase();
              let balanceToDisplay = "-";
              
              if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
                balanceToDisplay = data.balances.annual;
              } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
                balanceToDisplay = data.balances.medical;
              } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
                balanceToDisplay = data.balances.replacement;
              }
              
              setBakiLayak(balanceToDisplay);
            }
          })
          .catch(err => console.error("Error fetching balance:", err));
      }
    }
  }, [selectedRequest]);
"""

# Insert useEffect after the first useEffect or right before `useEffect(() => { const fetchLeaveRequests...`
target_str = "  useEffect(() => {\n    const fetchLeaveRequests"
content = content.replace(target_str, use_effect_str + "\n" + target_str)

# 3. Update the modal to display `bakiLayak` instead of `selectedRequest.balance ?? "-"`
replace_balance = "{selectedRequest.balance ?? \"-\"} HARI"
content = content.replace(replace_balance, "{bakiLayak} HARI")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("LeaveAdmin.tsx patched")
