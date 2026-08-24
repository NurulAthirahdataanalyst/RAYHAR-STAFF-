import sys

file_path = 'src/pages/master/LeaveEntitlementManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

broadcast_snippet = '''
      try {
        new BroadcastChannel("rayhar_leave_refresh").postMessage("refresh");
        window.dispatchEvent(new StorageEvent("storage", { key: "rayhar_employee_leave_balances" }));
      } catch (e) {}
'''

content = content.replace('if (onRefresh) onRefresh();', broadcast_snippet + '      if (onRefresh) onRefresh();')
content = content.replace('onRefresh?.();', broadcast_snippet + '      onRefresh?.();')
content = content.replace('onRefresh && onRefresh();', broadcast_snippet + '      onRefresh && onRefresh();')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched successfully')
