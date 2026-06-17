import cloudscraper
from bs4 import BeautifulSoup
import re
import time
import json

def get_page_url(base_url, page_num):
    """Constructs the URL for a specific page number."""
    if '?' in base_url:
        return f"{base_url}&page={page_num}"
    else:
        return f"{base_url}?page={page_num}"

def get_exercise_id(url):
    """Extracts the exercise ID from the URL."""
    match = re.search(r'/exercises/([^/?#]+?)(?:\.html)?$', url)
    if match:
        return match.group(1)
    return url.split('/')[-1].replace('.html', '')

def parse_stats(stats_block):
    """Parses the exercise statistics from the node-stats-block."""
    stats = {}
    if not stats_block:
        return stats

    for li in stats_block.find_all('li'):
        label_tag = li.find('span', class_='row-label')
        if not label_tag:
            continue

        key = label_tag.get_text(strip=True)
        # Get full text and remove the label to isolate the value
        li_text = li.get_text(' ', strip=True)
        val = li_text.replace(key, '', 1).strip()

        # Check for specific div structures used by the site
        field_items = li.find_all('div', class_='field-item')
        if field_items:
            val = [fi.get_text(strip=True) for fi in field_items]
        else:
            list_text_div = li.find('div', class_='field-type-list-text')
            if list_text_div:
                val = list_text_div.get_text(strip=True)

        stats[key] = val
    return stats

def scrape_exercise(url, scraper):
    """Scrapes all required data from a single exercise page."""
    print(f"Scraping: {url}")
    response = scraper.get(url)

    if response.status_code != 200:
        print(f"Failed to retrieve {url}: Status {response.status_code}")
        return None

    # Basic check for Cloudflare block
    if "Just a moment..." in response.text or "Attention Required! | Cloudflare" in response.text:
        print("Warning: Cloudflare challenge detected. The data might be incomplete.")

    soup = BeautifulSoup(response.text, 'html.parser')

    # 1. ID
    exercise_id = get_exercise_id(url)

    # 2. Name
    main_h1 = soup.select_one('main h1') or soup.select_one('.node-title h1') or soup.find('h1')
    name = main_h1.get_text(strip=True) if main_h1 else "Unknown"

    # 3. Stats (Target, Secondary, Equipment, Difficulty)
    stats_block = soup.find('div', class_='node-stats-block')
    stats = parse_stats(stats_block)

    target_muscles = stats.get('Target Muscle Group', [])
    if isinstance(target_muscles, str):
        target_muscles = [target_muscles]

    secondary_muscles_str = stats.get('Secondary Muscles', '')
    if isinstance(secondary_muscles_str, list):
        secondary_muscles = secondary_muscles_str
    else:
        secondary_muscles = [m.strip() for m in str(secondary_muscles_str).split(',') if m.strip()]

    equipment = stats.get('Equipment Required', '')
    if isinstance(equipment, list):
        equipment = equipment[0]
    equipment = str(equipment).strip()

    difficulty = stats.get('Experience Level', '')
    if isinstance(difficulty, list):
        difficulty = difficulty[0]
    difficulty = str(difficulty).lower().strip()

    # 4. isBodyweight
    is_bodyweight = 'bodyweight' in equipment.lower() or 'body weight' in equipment.lower()

    # 5. Instructions
    instructions = []
    ol = soup.select_one('.field-item.even ol') or soup.select_one('.field-item ol') or soup.find('ol')
    if ol:
        for li in ol.find_all('li'):
            instructions.append(li.get_text(strip=True))

    return {
        "id": exercise_id,
        "name": name,
        "bodyPart": "user_to_input",
        "targetMuscles": target_muscles,
        "secondaryMuscles": secondary_muscles,
        "equipment": equipment,
        "instructions": instructions,
        "difficulty": difficulty,
        "isBodyweight": is_bodyweight,
        "videoUrl": url
    }

def main():
    # You can change this to any category URL (e.g., /exercises/quads, /exercises/chest)
    # UPPER BACK
    # base_url = "https://www.muscleandstrength.com/exercises/middle-back"
    # OBLIQUES
    # base_url = "https://www.muscleandstrength.com/exercises/obliques"
    # QUADS
    # base_url = "https://www.muscleandstrength.com/exercises/quads"
    # SHOULDERS
    # base_url = "https://www.muscleandstrength.com/exercises/shoulders"
    # TRAPS
    # base_url = "https://www.muscleandstrength.com/exercises/traps"
    # TRICEPS
    base_url = "https://www.muscleandstrength.com/exercises/triceps"



    # Initialize cloudscraper to efficiently bypass Cloudflare IUAM
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'mobile': False
        }
    )

    print("Fetching pagination info...")
    response = scraper.get(base_url)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Determine total pages
    pager = soup.find('ul', class_='pager')
    total_pages = 1
    if pager:
        pager_items = pager.find_all('li', class_='pager-item')
        pager_current = pager.find_all('li', class_='pager-current')
        total_pages = len(pager_items) + len(pager_current)

    print(f"Total pages found: {total_pages}")

    all_exercise_urls = []

    # Collect all exercise links across all pages
    for i in range(total_pages):
        if i == 0:
            page_url = base_url
        else:
            page_url = get_page_url(base_url, i)

        print(f"Fetching exercise links from page {i+1}...")
        page_response = scraper.get(page_url)
        page_soup = BeautifulSoup(page_response.text, 'html.parser')

        node_titles = page_soup.find_all('div', class_='node-title')
        for div in node_titles:
            a_tag = div.find('a')
            if a_tag and a_tag.get('href'):
                href = a_tag['href']
                if not href.startswith('http'):
                    href = f"https://www.muscleandstrength.com{href}"
                all_exercise_urls.append(href)

        time.sleep(1) # Be polite to the server

    print(f"Total exercises to scrape: {len(all_exercise_urls)}")

    # Scrape individual exercise pages
    scraped_data = []
    for idx, url in enumerate(all_exercise_urls):
        data = scrape_exercise(url, scraper)
        if data:
            scraped_data.append(data)
        time.sleep(2) # Delay to avoid rate limiting

    # Save to scraped_data.json
    print("Saving data to scraped_data.json...")
    with open('scraped_data.json', 'w', encoding='utf-8') as f:
        json.dump(scraped_data, f, indent=4)

    print("Done! Data successfully saved to scraped_data.json")

if __name__ == "__main__":
    main()
