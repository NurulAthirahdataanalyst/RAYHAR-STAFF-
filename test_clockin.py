import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    url = "https://rayhar-staff.onrender.com/api/attendance"
    payload = {
        "user_id": "E001",
        "location": "HQ",
        "attendance_type": "BRANCH",
        "latitude": 4.2248,
        "longitude": 103.4194,
        "accuracy": 10,
        "distance": 34
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req, context=ctx).read()
    print(json.loads(response))
except Exception as e:
    print(e)
