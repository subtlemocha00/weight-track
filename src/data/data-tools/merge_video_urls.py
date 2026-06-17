import json

def merge_fixed_urls():
    fixed_file = "fixed_video_urls.json"
    original_file = "exercises.json"
    output_file = "exercises_fixed.json"

    # 1. Load the fixed URLs and create a lookup dictionary for instant access
    print(f"Loading fixed URLs from '{fixed_file}'...")
    with open(fixed_file, 'r', encoding='utf-8') as f:
        fixed_data = json.load(f)

    # Create a dictionary mapping 'id' -> 'videoUrl'
    # This makes looking up an ID an O(1) instant operation
    url_lookup = {item['id']: item['videoUrl'] for item in fixed_data if 'id' in item}
    print(f"Loaded {len(url_lookup)} fixed URLs into memory.")

    # 2. Load the original exercises (Strictly in READ mode)
    print(f"Loading original exercises from '{original_file}'...")
    with open(original_file, 'r', encoding='utf-8') as f:
        exercises = json.load(f)
    print(f"Loaded {len(exercises)} exercises.")

    # 3. Update the exercises in memory
    print("Matching and updating video URLs...")
    updated_count = 0

    for exercise in exercises:
        ex_id = exercise.get('id')

        # If this exercise's ID is in our fixed dictionary, update the URL
        if ex_id in url_lookup:
            exercise['videoUrl'] = url_lookup[ex_id]
            updated_count += 1

    print(f"Successfully updated {updated_count} video URLs.")

    # 4. Save the modified data to the NEW file
    print(f"Saving updated exercises to '{output_file}'...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(exercises, f, indent=2)

    print("\nDone!")
    print(f"-> '{output_file}' has been created with the updated URLs.")
    print(f"-> '{original_file}' remains completely unchanged.")

if __name__ == "__main__":
    merge_fixed_urls()
