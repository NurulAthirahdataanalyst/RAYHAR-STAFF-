import urllib.request
import json

try:
    url = "https://rayhar-staff.onrender.com/api/attendance/history?userId=E001&month=8&year=2026"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req).read()
    data = json.loads(response)
    if data['success']:
        print("Latest log:")
        print(data['history'][0])
    else:
        print(data)
except Exception as e:
    print(e)
