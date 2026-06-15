import json
import time
from curl_cffi import requests
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
INPUT_FILE = 'exercises_alpha_enhanced2.json'
OUTPUT_FILE = 'exercises_alpha_enhanced3.json' # Change to INPUT_FILE if you want to overwrite

def scrape_exercise_data(url):
    """Fetches the page and extracts Instructions and Exercise Profile."""
    try:
        response = requests.get(url, impersonate="chrome120")
    except Exception as e:
        print(f"   [!] Network error: {e}")
        return None

    if response.status_code != 200:
        print(f"   [!] Failed to fetch. Status: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Default empty structure
    extracted_data = {
        "instructions": [],
        "targetMuscles": [],
        "secondaryMuscles": [],
        "equipment": "",
        "difficulty": "",
        "isBodyweight": False
    }

    # 1. EXTRACT INSTRUCTIONS
    h2_instructions = soup.find('h2', string=lambda t: t and 'Instructions' in t)
    if h2_instructions:
        ol_tag = h2_instructions.find_next('ol')
        if ol_tag:
            extracted_data["instructions"] = [
                li.get_text(strip=True) for li in ol_tag.find_all('li')
            ]

    # 2. EXTRACT EXERCISE PROFILE
    profile_div = soup.find('div', class_='node-stats-block')
    if profile_div:
        ul_tag = profile_div.find('ul')
        if ul_tag:
            for li in ul_tag.find_all('li'):
                label_span = li.find('span', class_='row-label')
                if not label_span:
                    continue

                label = label_span.get_text(strip=True)
                full_text = li.get_text(strip=True)
                value = full_text.replace(label, '').strip()

                if label == "Target Muscle Group":
                    a_tag = li.find('a')
                    muscle = a_tag.get_text(strip=True) if a_tag else value
                    if muscle:
                        extracted_data["targetMuscles"] = [muscle]

                elif label == "Equipment Required":
                    extracted_data["equipment"] = value.lower()
                    if 'body weight' in value.lower():
                        extracted_data["isBodyweight"] = True

                elif label == "Experience Level":
                    extracted_data["difficulty"] = value

                elif label == "Secondary Muscles":
                    sec_div = li.find('div', class_='field-type-list-text')
                    sec_text = sec_div.get_text(strip=True) if sec_div else value

                    if sec_text.lower() == 'none' or not sec_text:
                        extracted_data["secondaryMuscles"] = []
                    else:
                        extracted_data["secondaryMuscles"] = [
                            m.strip() for m in sec_text.split(',') if m.strip()
                        ]

    return extracted_data

def main():
    # 1. Load the JSON data
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            exercises = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find '{INPUT_FILE}'. Please make sure it's in the same folder.")
        return

    # 2. Filter down to entries missing EITHER instructions OR targetMuscles
    # (If either is empty, it indicates the previous scrape failed or was incomplete)
    missing_data = [
        ex for ex in exercises
        if not ex.get("instructions") or not ex.get("targetMuscles")
    ]

    if not missing_data:
        print("Great news! All exercises already have instructions and targetMuscles. No updates needed.")
        return

    print(f"Found {len(missing_data)} exercises missing data. Starting update process...\n")

    updates_successful = 0

    # 3. Loop through and retry
    for i, exercise in enumerate(missing_data):
        name = exercise.get('name', 'Unknown')
        url = exercise.get('videoUrl', '')

        print(f"[{i+1}/{len(missing_data)}] Updating: {name}")

        if not url:
            print("   -> Skipped: No videoUrl found.")
            continue

        scraped_info = scrape_exercise_data(url)

        if scraped_info:
            # Check if we actually found any useful data on the page
            has_new_data = (
                len(scraped_info.get("instructions", [])) > 0 or
                len(scraped_info.get("targetMuscles", [])) > 0
            )

            if has_new_data:
                # Merge the new data into the existing object.
                # This fills in the blanks but keeps id, name, videoUrl, etc. intact.
                exercise.update(scraped_info)
                print(f"   -> Success! Updated fields.")
                updates_successful += 1
            else:
                print("   -> Page loaded, but no instructions/target muscles found. Leaving fields empty.")
        else:
            print("   -> Link failed. Leaving fields empty.")

        # Wait 2 seconds to be polite to the server and avoid Cloudflare bans
        time.sleep(2)

    # 4. Save to the output file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(exercises, f, indent=4, ensure_ascii=False)

    print(f"\nUpdate process complete!")
    print(f"Successfully updated {updates_successful} out of {len(missing_data)} exercises.")
    print(f"Your final data is saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
