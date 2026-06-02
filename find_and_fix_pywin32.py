import os
import shutil
import sys

def fix_pywin32():
    print(f"Python version: {sys.version}")
    print(f"Executable: {sys.executable}")
    
    # Common paths for user site-packages
    user_site_packages = r"C:\Users\HP\AppData\Roaming\Python\Python314\site-packages"
    system_packages = r"C:\Python314\Lib\site-packages"
    
    found_dlls = []
    
    # Search in user site-packages
    for root, dirs, files in os.walk(user_site_packages):
        for file in files:
            if "pywintypes" in file and file.endswith(".dll"):
                path = os.path.join(root, file)
                found_dlls.append(path)
                print(f"Found DLL in user site-packages: {path}")

    # Search in system site-packages
    for root, dirs, files in os.walk(system_packages):
        for file in files:
            if "pywintypes" in file and file.endswith(".dll"):
                path = os.path.join(root, file)
                found_dlls.append(path)
                print(f"Found DLL in system packages: {path}")

    if not found_dlls:
        print("No pywintypes DLLs found!")
        return

    # Try copying the DLL to win32 and win32\lib
    for dll_path in found_dlls:
        filename = os.path.basename(dll_path)
        
        # Target directories
        targets = [
            os.path.join(user_site_packages, "win32", filename),
            os.path.join(user_site_packages, "win32", "lib", filename),
            os.path.join(user_site_packages, "win32com", filename),
            os.path.join(os.path.dirname(sys.executable), filename), # C:\Python314
            os.path.join(os.path.dirname(sys.executable), "DLLs", filename)
        ]
        
        for target in targets:
            try:
                target_dir = os.path.dirname(target)
                if os.path.exists(target_dir):
                    print(f"Copying {dll_path} to {target}...")
                    shutil.copy2(dll_path, target)
            except Exception as e:
                print(f"Failed to copy to {target}: {e}")

if __name__ == "__main__":
    fix_pywin32()
