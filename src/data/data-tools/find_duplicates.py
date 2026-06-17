import json
from collections import Counter

def find_duplicates():
    INPUT_FILE = "exercises.json"
    OUTPUT_FILE = "duplicates.json"

    print(f"Loading exercises from '{INPUT_FILE}'...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        exercises = json.load(f)

    print(f"Loaded {len(exercises)} total exercises. Scanning for duplicates...")

    # 1. Count how many times each ID and Name appears.
    # We use 'if ex.get(...)' to ignore exercises that are missing an ID or Name,
    # so we don't accidentally group all the "null" values together as duplicates.
    id_counts = Counter(ex['id'] for ex in exercises if ex.get('id'))
    name_counts = Counter(ex['name'] for ex in exercises if ex.get('name'))

    duplicates = []

    # 2. Find the duplicates
    for ex in exercises:
        ex_id = ex.get('id')
        ex_name = ex.get('name')

        is_duplicate = False

        # Check if this specific ID appears more than once
        if ex_id and id_counts[ex_id] > 1:
            is_duplicate = True

        # Check if this specific Name appears more than once
        if ex_name and name_counts[ex_name] > 1:
            is_duplicate = True

        # If either condition is met, add the ENTIRE object to our list
        if is_duplicate:
            duplicates.append(ex)

    # 3. Sort the results alphabetically by name
    # We use .lower() so that "Bench Press" and "apple" sort correctly
    # (otherwise, capital letters would sort before lowercase letters in ASCII).
    duplicates.sort(key=lambda x: x.get('name', '').lower())

    # 4. Save to the new file
    print(f"Found {len(duplicates)} duplicate entries.")
    print(f"Saving to '{OUTPUT_FILE}'...")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(duplicates, f, indent=2)

    print("Done! Check duplicates.json to see your results.")

if __name__ == "__main__":
    find_duplicates()
