import re

def fix_map_nan(fpath, lat_expr_center, lng_expr_center, lat_expr_marker, lng_expr_marker, controller_lat, controller_lng):
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix MapContainer center — guard against NaN
    old_center = f'center={{{lat_expr_center} && {lng_expr_center} ? [parseFloat({lat_expr_center}), parseFloat({lng_expr_center})] : [4.2248, 103.4194]}}'
    new_center = f"""center={{(() => {{
                  const _lat = parseFloat(String({lat_expr_center}));
                  const _lng = parseFloat(String({lng_expr_center}));
                  return (!isNaN(_lat) && !isNaN(_lng)) ? [_lat, _lng] : [4.2248, 103.4194];
                }})() as [number, number]}}"""
    if old_center in content:
        content = content.replace(old_center, new_center)
        print(f"Fixed MapContainer center in {fpath.split(chr(92))[-1]}")
    else:
        print(f"WARNING: center pattern not found in {fpath.split(chr(92))[-1]}")

    # Fix Marker position — guard against NaN
    old_marker = f'{{{lat_expr_marker} && {lng_expr_marker} && (\n                  <Marker position={{[parseFloat({lat_expr_marker}), parseFloat({lng_expr_marker})]}} />'
    new_marker = f"""{{(() => {{
                  const _mlat = parseFloat(String({lat_expr_marker}));
                  const _mlng = parseFloat(String({lng_expr_marker}));
                  return (!isNaN(_mlat) && !isNaN(_mlng)) ? <Marker position={{[_mlat, _mlng]}} /> : null;
                }})()}}"""
    if lat_expr_marker + " && " + lng_expr_marker + " && (" in content:
        content = re.sub(
            re.escape(f'{lat_expr_marker} && {lng_expr_marker} && (\n                  <Marker position={{[parseFloat({lat_expr_marker}), parseFloat({lng_expr_marker})]}} />\n                )}'),
            f"""(() => {{
                  const _mlat = parseFloat(String({lat_expr_marker}));
                  const _mlng = parseFloat(String({lng_expr_marker}));
                  return (!isNaN(_mlat) && !isNaN(_mlng)) ? <Marker position={{[_mlat, _mlng]}} /> : null;
                }})()}}""",
            content
        )
        print(f"Fixed Marker in {fpath.split(chr(92))[-1]}")
    else:
        print(f"WARNING: marker pattern not found in {fpath.split(chr(92))[-1]}")

    # Fix MapController center prop too
    old_ctrl = f'<MapController center={{{controller_lat} && {controller_lng} ? [parseFloat({controller_lat}), parseFloat({controller_lng})] : [4.2248, 103.4194]}}'
    new_ctrl = f"""<MapController center={{(() => {{
                  const _clat = parseFloat(String({controller_lat}));
                  const _clng = parseFloat(String({controller_lng}));
                  return (!isNaN(_clat) && !isNaN(_clng)) ? [_clat, _clng] : [4.2248, 103.4194];
                }})() as [number, number]}}"""
    if old_ctrl in content:
        content = content.replace(old_ctrl, new_ctrl)
        print(f"Fixed MapController center in {fpath.split(chr(92))[-1]}")

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)


# Branches.tsx uses editBranchData.latitude / editBranchData.longitude
fix_map_nan(
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx",
    "editBranchData.latitude", "editBranchData.longitude",
    "editBranchData.latitude", "editBranchData.longitude",
    "editBranchData.latitude", "editBranchData.longitude"
)

# Settings.tsx uses newBranchData.latitude / newBranchData.longitude
fix_map_nan(
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx",
    "newBranchData.latitude", "newBranchData.longitude",
    "newBranchData.latitude", "newBranchData.longitude",
    "newBranchData.latitude", "newBranchData.longitude"
)
