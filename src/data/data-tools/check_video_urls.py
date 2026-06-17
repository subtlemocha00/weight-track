import json
import cloudscraper
from concurrent.futures import ThreadPoolExecutor, as_completed

# Create a single cloudscraper session to reuse connections and speed things up
scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'mobile': False
    }
)

def check_video_url(item):
    """Checks a single exercise object. Returns the object if the URL is faulty, else None."""
    url = item.get('videoUrl')

    # 1. Skip if videoUrl is null, empty, or missing
    if not url:
        return None

    try:
        # 2. Make the request with a 10-second timeout to prevent hanging
        response = scraper.get(url, timeout=10, allow_redirects=True)

        # 3. Check for standard 404 Not Found
        if response.status_code == 404:
            return item

        # 4. Check for other HTTP errors (403, 500, etc.)
        if response.status_code >= 400:
            return item

        # 5. Some video hosts return a 200 OK status but display an "Error" page in the HTML
        if response.status_code == 200:
            text_lower = response.text.lower()
            error_phrases = [
                'video unavailable',
                'this video is private',
                'video has been removed',
                'video not found',
                'page not found'
            ]
            if any(phrase in text_lower for phrase in error_phrases):
                return item

        # If it passes all checks, it's valid
        return None

    except Exception as e:
        # If the connection fails, times out, or DNS fails, mark it as faulty
        # We print the error to the console so you can see what's happening,
        # but the script won't crash.
        print(f"  [!] Connection error for {url}: {type(e).__name__}")
        return item

def main():
    input_file = "exercises_simplified.json"
    output_file = "faulty_video_urls.json"

    print(f"Loading data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        exercises = json.load(f)

    # Filter out objects where videoUrl is null/None right away to save time
    urls_to_check = [ex for ex in exercises if ex.get('videoUrl')]
    print(f"Found {len(urls_to_check)} non-null URLs to check. Starting concurrent checks...")

    faulty_exercises = []

    # Use ThreadPoolExecutor to check up to 30 URLs at the exact same time
    # This makes the script run incredibly fast compared to a standard loop
    with ThreadPoolExecutor(max_workers=30) as executor:
        # Map the function to the data
        future_to_item = {executor.submit(check_video_url, item): item for item in urls_to_check}

        completed = 0
        total = len(urls_to_check)

        for future in as_completed(future_to_item):
            completed += 1
            result = future.result()

            # Print a quick progress update every 50 URLs
            if completed % 50 == 0 or completed == total:
                print(f"  Progress: {completed}/{total} URLs checked...")

            if result is not None:
                faulty_exercises.append(result)

    print(f"\nDone! Found {len(faulty_exercises)} faulty URLs.")
    print(f"Saving results to {output_file}...")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(faulty_exercises, f, indent=2)

    print("Success!")

if __name__ == "__main__":
    main()
