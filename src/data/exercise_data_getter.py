import json
import time
from curl_cffi import requests
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
# Change this to the actual name of your starting JSON file in the same folder
INPUT_FILE = 'exercises.json'
OUTPUT_FILE = 'enriched_exercises.json'

def scrape_exercise_data(url):
    """Fetches the page and extracts Instructions and Exercise Profile."""
    try:
        # Bypass Cloudflare by impersonating a real Chrome browser
        response = requests.get(url, impersonate="chrome120")
    except Exception as e:
        print(f"   [!] Network error: {e}")
        return None

    if response.status_code != 200:
        print(f"   [!] Failed to fetch. Status: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Default extracted data structure
    extracted_data = {
        "instructions": [],
        "targetMuscles": [],
        "secondaryMuscles": [],
        "equipment": "",
        "difficulty": "",
        "isBodyweight": False
    }

    # ==========================================
    # 1. EXTRACT INSTRUCTIONS
    # ==========================================
    # Find the <h2> that contains the exact word "Instructions"
    h2_instructions = soup.find('h2', string=lambda t: t and 'Instructions' in t)
    if h2_instructions:
        # Find the very next <ol> after that <h2>
        ol_tag = h2_instructions.find_next('ol')
        if ol_tag:
            extracted_data["instructions"] = [
                li.get_text(strip=True) for li in ol_tag.find_all('li')
            ]
    # If not found, it safely remains an empty list []

    # ==========================================
    # 2. EXTRACT EXERCISE PROFILE
    # ==========================================
    # Find the container for the Exercise Profile
    profile_div = soup.find('div', class_='node-stats-block')
    if profile_div:
        ul_tag = profile_div.find('ul')
        if ul_tag:
            for li in ul_tag.find_all('li'):
                label_span = li.find('span', class_='row-label')
                if not label_span:
                    continue

                label = label_span.get_text(strip=True)

                # Helper to get the value text (removes the label text from the whole li text)
                full_text = li.get_text(strip=True)
                value = full_text.replace(label, '').strip()

                # --- MAP TO JSON FIELDS ---
                if label == "Target Muscle Group":
                    # Extract from <a> tag if it exists, otherwise use text
                    a_tag = li.find('a')
                    muscle = a_tag.get_text(strip=True) if a_tag else value
                    if muscle:
                        extracted_data["targetMuscles"] = [muscle]

                elif label == "Equipment Required":
                    # 1. Map to equipment in lowercase
                    extracted_data["equipment"] = value.lower()
                    # 2. Auto-set isBodyweight to true if it's body weight
                    if 'body weight' in value.lower():
                        extracted_data["isBodyweight"] = True

                elif label == "Experience Level":
                    # Map to difficulty
                    extracted_data["difficulty"] = value

                elif label == "Secondary Muscles":
                    # Look for the specific div class you provided
                    sec_div = li.find('div', class_='field-type-list-text')
                    sec_text = sec_div.get_text(strip=True) if sec_div else value

                    if sec_text.lower() == 'none' or not sec_text:
                        extracted_data["secondaryMuscles"] = []
                    else:
                        # Split the comma-separated string into an array
                        extracted_data["secondaryMuscles"] = [
                            m.strip() for m in sec_text.split(',') if m.strip()
                        ]

    return extracted_data

def main():
    # 1. Load the original JSON data
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            exercises = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find '{INPUT_FILE}'. Please make sure it's in the same folder as this script.")
        return

    print(f"Loaded {len(exercises)} exercises. Starting scrape...\n")

    # 2. Loop through and scrape
    for i, exercise in enumerate(exercises):
        url = exercise.get('videoUrl')
        name = exercise.get('name', 'Unknown')

        print(f"[{i+1}/{len(exercises)}] Processing: {name}")

        if not url:
            print("   -> Skipped: No videoUrl found.")
            continue

        scraped_info = scrape_exercise_data(url)

        if scraped_info:
            # Merge the scraped data into the original exercise object.
            # This overwrites the empty fields but keeps id, name, videoUrl, bodyPart, etc. intact.
            exercise.update(scraped_info)
            print(f"   -> Success! Got {len(scraped_info['instructions'])} instructions.")
        else:
            print("   -> Failed to scrape. Keeping original empty fields.")

        # IMPORTANT: Wait 2 seconds between requests to avoid getting blocked by Cloudflare
        time.sleep(2)

    # 3. Save to the NEW enriched file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(exercises, f, indent=4, ensure_ascii=False)

    print(f"\nScraping complete! Your enriched data is saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
