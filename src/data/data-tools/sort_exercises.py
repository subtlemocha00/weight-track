import json

def sort_exercises_json(filename="exercises.json"):
    try:
        # 1. Read the JSON file
        with open(filename, 'r', encoding='utf-8') as file:
            data = json.load(file)

        # 2. Verify the data is a list
        if not isinstance(data, list):
            print("Error: The JSON file does not contain a top-level array/list.")
            return

        # 3. Sort the data
        # We sort by a tuple: (lowercase name, original name)
        # - lowercase name ensures case-agnostic sorting
        # - original name acts as a deterministic tie-breaker (e.g., "Apple" before "apple")
        # - Standard character encoding naturally places numbers (0-9) before letters (A-Z)
        sorted_data = sorted(
            data,
            key=lambda x: (x.get("name", "").lower(), x.get("name", ""))
        )

        # 4. Write the sorted data back to the file
        with open(filename, 'w', encoding='utf-8') as file:
            json.dump(sorted_data, file, indent=2, ensure_ascii=False)

        print(f"Successfully sorted {len(sorted_data)} exercises in '{filename}'.")

    except FileNotFoundError:
        print(f"Error: The file '{filename}' was not found.")
    except json.JSONDecodeError:
        print(f"Error: The file '{filename}' is not valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    sort_exercises_json()
