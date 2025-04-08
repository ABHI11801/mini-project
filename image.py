import os
import requests

# Unsplash Access Key
ACCESS_KEY = "-dSvXE_pvUYogWvx-osEGeO2wrZ6xuIRnd4IUndh6kU"

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
output_folder = os.path.join(script_dir, "output")
images_folder = os.path.join(output_folder, "images")
image_file_path = os.path.join(output_folder, "images.txt")

# Ensure output and images folders exist
os.makedirs(images_folder, exist_ok=True)

# Read filenames from images.txt
with open(image_file_path, "r") as f:
    filenames = [line.strip() for line in f if line.strip()]

# Headers for Unsplash API
headers = {
    "Accept-Version": "v1",
    "Authorization": f"Client-ID {ACCESS_KEY}"
}

# Download one image per search term
for file_name in filenames:
    search_term = os.path.splitext(file_name)[0]  # Strip extension for searching
    save_path = os.path.join(images_folder, file_name)  # Save in 'output/images/'

    try:
        print(f"Searching for '{search_term}'...")
        response = requests.get(
            f"https://api.unsplash.com/search/photos?query={search_term}&per_page=1",
            headers=headers
        )
        data = response.json()
        if data["results"]:
            image_url = data["results"][0]["urls"]["full"]

            # Download image
            img_data = requests.get(image_url, stream=True)
            if img_data.status_code == 200:
                with open(save_path, "wb") as f:
                    for chunk in img_data.iter_content(1024):
                        f.write(chunk)
                print(f" Saved as: {file_name}")
            else:
                print(f" Failed to download image for '{search_term}'")
        else:
            print(f" No image found for '{search_term}'")
    except Exception as e:
        print(f" Error processing '{search_term}': {e}")
