import json
import time
import re
from curl_cffi import requests
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
INPUT_FILE = 'exercise_alphabetized.json'
OUTPUT_FILE = 'exercises_alpha_enhanced.json'

def generate_id(name):
    """Generates a URL-friendly ID from the exercise name."""
    if not name:
        return "unknown-exercise"

    # Lowercase and replace specific characters
    slug = name.lower().strip()
    slug = slug.replace('/', '-').replace('&', 'and')

    # Remove any character that is not a letter, number, or hyphen
    slug = re.sub(r'[^a-z0-9-]', '', slug)

    # Replace multiple consecutive hyphens with a single hyphen
    slug = re.sub(r'-+', '-', slug)

    return slug.strip('-')

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
    h2_instructions = soup.find('h2', string=lambda t: t and 'Instructions' in t)
    if h2_instructions:
        ol_tag = h2_instructions.find_next('ol')
        if ol_tag:
            extracted_data["instructions"] = [
                li.get_text(strip=True) for li in ol_tag.find_all('li')
            ]

    # ==========================================
    # 2. EXTRACT EXERCISE PROFILE
    # ==========================================
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
    # 1. Load the original JSON data
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            exercises = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find '{INPUT_FILE}'. Please make sure it's in the same folder.")
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

        # Generate the ID based on the name
        exercise["id"] = generate_id(name)

        # Initialize missing fields with default empty values
        # (so the output perfectly matches your desired schema)
        defaults = {
            "bodyPart": "",
            "targetMuscles": [],
            "secondaryMuscles": [],
            "equipment": "",
            "instructions": [],
            "difficulty": "",
            "isBodyweight": False
        }

        # Merge defaults first, then scrape, so scraped data overwrites the defaults
        exercise.update(defaults)

        scraped_info = scrape_exercise_data(url)

        if scraped_info:
            exercise.update(scraped_info)
            print(f"   -> Success! Got {len(scraped_info['instructions'])} instructions.")
        else:
            print("   -> Failed to scrape. Keeping default empty fields.")

        # Wait 2 seconds to avoid Cloudflare bans
        time.sleep(2)

    # 3. Save to the NEW enriched file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(exercises, f, indent=4, ensure_ascii=False)

    print(f"\nScraping complete! Your enhanced data is saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
