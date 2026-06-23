import zipfile
import os

def create_zip():
    zip_name = "production-release.zip"
    
    # Exclude directories that are not needed for deployment
    exclude_dirs = {'.git', 'node_modules', '.venv', '__pycache__', 'dist', '.qodo', 'netlify-deploy', 'step2-backend-release', 'outputs'}
    # Exclude files
    exclude_files = {zip_name, 'database.backup.db'}
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith('.zip'):
                    continue
                    
                file_path = os.path.join(root, file)
                # Keep the same structure inside the zip
                arcname = os.path.relpath(file_path, '.')
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    print("Creating production release zip...")
    create_zip()
    print("Done! Created production-release.zip")
