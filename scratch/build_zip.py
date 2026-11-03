import os
import zipfile
import shutil

ROOT_DIR = r"c:\xampp\htdocs\ds_enterprises"
ZIP_FILE_1 = os.path.join(ROOT_DIR, "DS_Enterprises_Complete_Project.zip")
ZIP_FILE_2 = os.path.join(ROOT_DIR, "ds_enterprises.zip")

EXCLUDE_DIRS = {
    ".git",
    ".gemini",
    "node_modules",
    "scratch",
    "db", # under data/
    ".system_generated",
    ".vscode"
}

EXCLUDE_EXTS = {
    ".zip",
    ".log",
    ".tmp"
}

def should_exclude(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
    ext = os.path.splitext(rel_path)[1].lower()
    if ext in EXCLUDE_EXTS:
        return True
    return False

def build_zip(target_path):
    temp_zip = target_path + ".tmp"
    if os.path.exists(temp_zip):
        os.remove(temp_zip)
    
    count = 0
    with zipfile.ZipFile(temp_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
            # Prune exclude dirs
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            
            for f in filenames:
                full_path = os.path.join(dirpath, f)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                
                if should_exclude(rel_path):
                    continue
                
                zf.write(full_path, rel_path)
                count += 1

    if os.path.exists(target_path):
        os.remove(target_path)
    os.rename(temp_zip, target_path)
    
    size_mb = os.path.getsize(target_path) / (1024 * 1024)
    print(f"Built {os.path.basename(target_path)}: {count} files, {size_mb:.2f} MB")
    
    # Test zip
    with zipfile.ZipFile(target_path, "r") as zf:
        bad_file = zf.testzip()
        if bad_file:
            raise Exception(f"Corrupt file in zip: {bad_file}")
        print(f"Verified {os.path.basename(target_path)}: 100% OK, testzip passed!")

def main():
    print("Starting clean Python ZIP build...")
    build_zip(ZIP_FILE_1)
    
    # Copy to ZIP_FILE_2
    if os.path.exists(ZIP_FILE_2):
        os.remove(ZIP_FILE_2)
    shutil.copyfile(ZIP_FILE_1, ZIP_FILE_2)
    
    with zipfile.ZipFile(ZIP_FILE_2, "r") as zf:
        bad_file = zf.testzip()
        if bad_file:
            raise Exception(f"Corrupt file in zip 2: {bad_file}")
        print(f"Verified {os.path.basename(ZIP_FILE_2)}: 100% OK, testzip passed!")
    
    print("All ZIP files successfully built and verified!")

if __name__ == "__main__":
    main()

