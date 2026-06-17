import json

def simplify_exercises(input_file, output_file):
    # Read the original JSON file
    with open(input_file, 'r', encoding='utf-8') as file:
        exercises = json.load(file)

    # Create a new list with only the 'id' and 'videoUrl' fields
    simplified_exercises = []
    for exercise in exercises:
        # Using .get() ensures the script won't crash if an object is missing one of the keys
        simplified_obj = {
            "id": exercise.get("id"),
            "videoUrl": exercise.get("videoUrl")
        }
        simplified_exercises.append(simplified_obj)

    # Write the new list to the output JSON file
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(simplified_exercises, file, indent=2)

    print(f"Success! Created '{output_file}' with {len(simplified_exercises)} objects.")

if __name__ == "__main__":
    # Define your input and output file names
    INPUT_FILENAME = "exercises_fixed.json"
    OUTPUT_FILENAME = "exercises_simplified.json"

    simplify_exercises(INPUT_FILENAME, OUTPUT_FILENAME)
