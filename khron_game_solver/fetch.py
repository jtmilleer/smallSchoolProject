import requests
import os
from datetime import datetime

# 1. Configuration
BASE_URL = "https://homepage.divms.uiowa.edu/~eakrohn/game/"
DATA_DIR = "data"
# This generates '26012026' for today
DATE_STR = datetime.now().strftime("%d%m%Y") 

# Create the data directory locally if it doesn't exist
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# 2. List of files to download
# Note: dictionary.txt is in the root, others are in /data/
files = {
    "data": [
        f"{DATE_STR}_letters.txt",
        f"{DATE_STR}_board.txt",
        f"{DATE_STR}Solution.txt"
    ]
}

def download_file(filename, subfolder=""):
    url = f"{BASE_URL}{subfolder}{filename}"
    save_path = os.path.join(subfolder, filename) if subfolder else filename
    
    print(f"Attempting to download: {url}")
    
    try:
        # User-Agent header helps avoid being blocked as a bot
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(response.text)
            print(f"✅ Saved to {save_path}")
        else:
            print(f"❌ Failed: {filename} (Status {response.status_code})")
    except Exception as e:
        print(f"⚠️ Error: {e}")

# 3. Execution
if __name__ == "__main__":
    # Download daily files
    for file in files["data"]:
        download_file(file, "data/")