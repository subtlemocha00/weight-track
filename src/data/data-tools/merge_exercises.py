import json
import sys
import os

def merge_json_files(base_file, files_to_add, output_file):
    print(f"Loading base file: {base_file}...")

    # 1. Load the base exercises.json file
    with open(base_file, 'r', encoding='utf-8') as f:
        try:
            base_data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Could not parse {base_file}. Ensure it is valid JSON.")
            sys.exit(1)

    # Create a dictionary keyed by 'name' for fast lookups and updates
    # This automatically handles any duplicates within the base file itself
    combined_dict = {item['name']: item for item in base_data if 'name' in item}
    original_count = len(combined_dict)

    # 2. Process each additional file
    for file_path in files_to_add:
        if not os.path.exists(file_path):
            print(f"Warning: File '{file_path}' not found. Skipping.")
            continue

        print(f"Merging: {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                new_data = json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Could not parse '{file_path}'. Skipping.")
                continue

        for item in new_data:
            name = item.get('name')
            if not name:
                continue # Skip malformed items missing a name

            if name in combined_dict:
                # Duplicate found: overwrite the data, but preserve the original ID
                original_id = combined_dict[name].get('id')
                combined_dict[name] = item

                # Restore the original ID from exercises.json
                if original_id is not None:
                    combined_dict[name]['id'] = original_id
            else:
                # New item, just add it
                combined_dict[name] = item

    # 3. Convert back to a list and sort alphabetically by 'name' (case-insensitive)
    combined_list = list(combined_dict.values())
    combined_list.sort(key=lambda x: x.get('name', '').lower())

    # 4. Save to the new output file
    print(f"Saving merged data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(combined_list, f, indent=4)

    print(f"\nDone!")
    print(f"Original exercises: {original_count}")
    print(f"Total exercises after merge: {len(combined_list)}")
    print(f"Output saved to: {output_file}")

if __name__ == "__main__":
    # Check if files were provided as arguments
    if len(sys.argv) < 2:
        print("Usage: python merge_exercises.py <file1.json> <file2.json> ...")
        print("Example: python merge_exercises.py obliques.json quads.json chest.json")
        print("\nNote: The base file 'exercises.json' is loaded automatically.")
        sys.exit(1)

    base_file = "exercises.json"
    files_to_add = sys.argv[1:]
    output_file = "combined_exercises.json"

    # Ensure the base file exists before proceeding
    if not os.path.exists(base_file):
        print(f"Error: Base file '{base_file}' not found in the current directory.")
        sys.exit(1)

    merge_json_files(base_file, files_to_add, output_file)
