"""
Muscle & Strength Exercise Metadata Scraper

Usage:
    pip install requests beautifulsoup4 lxml tqdm
    python scrape_mns_exercises.py exercises.json enriched_exercises.json
"""

import json
import re
import sys
import time
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def slugify_from_url(url):
    path = urlparse(url).path.strip("/")
    return path.split("/")[-1].replace(".html", "")


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def fetch_page(url):
    """
    Try original URL, then fallback between .html and non-.html version.
    Returns: (html, final_url) or (None, None)
    """
    variants = [url]

    if url.endswith(".html"):
        variants.append(url[:-5])
    else:
        variants.append(url + ".html")

    for u in variants:
        try:
            r = requests.get(u, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r.text, u
        except Exception:
            continue

    return None, None


def parse_exercise(url):
    html, final_url = fetch_page(url)

    if not html:
        return {
            "bodyPart": "",
            "targetMuscles": [],
            "secondaryMuscles": [],
            "equipment": "",
            "instructions": [],
            "difficulty": "",
        }, None

    soup = BeautifulSoup(html, "lxml")

    result = {
        "bodyPart": "",
        "targetMuscles": [],
        "secondaryMuscles": [],
        "equipment": "",
        "instructions": [],
        "difficulty": "",
    }

    # Find common metadata tables
    for row in soup.select("table tr"):
        cols = row.find_all(["th", "td"])
        if len(cols) < 2:
            continue

        key = clean(cols[0].get_text(" ", strip=True)).lower()
        value = clean(cols[1].get_text(" ", strip=True))

        if "body part" in key:
            result["bodyPart"] = value.lower()

        elif "target muscle" in key:
            result["targetMuscles"] = [
                clean(x).lower()
                for x in re.split(r",|/|\|", value)
                if clean(x)
            ]

        elif "secondary" in key:
            result["secondaryMuscles"] = [
                clean(x).lower()
                for x in re.split(r",|/|\|", value)
                if clean(x)
            ]

        elif "equipment" in key:
            result["equipment"] = value.lower()

        elif "difficulty" in key:
            result["difficulty"] = value.lower()

    # Fallback metadata blocks
    for block in soup.find_all(["div", "li", "span"]):
        txt = clean(block.get_text(" ", strip=True))

        if txt.startswith("Body Part"):
            result["bodyPart"] = txt.replace("Body Part", "").strip(": ").lower()

        elif txt.startswith("Equipment"):
            result["equipment"] = txt.replace("Equipment", "").strip(": ").lower()

        elif txt.startswith("Difficulty"):
            result["difficulty"] = txt.replace("Difficulty", "").strip(": ").lower()

    # Instructions
    instruction_headers = soup.find_all(
        lambda tag: tag.name in ["h2", "h3", "h4"]
        and "instruction" in tag.get_text(strip=True).lower()
    )

    for header in instruction_headers:
        steps = []

        nxt = header.find_next_sibling()
        while nxt:
            if nxt.name in ["h2", "h3", "h4"]:
                break

            if nxt.name in ["ol", "ul"]:
                for li in nxt.find_all("li"):
                    txt = clean(li.get_text(" ", strip=True))
                    if txt:
                        steps.append(txt)

            nxt = nxt.find_next_sibling()

        if steps:
            result["instructions"] = steps
            break

    return result, final_url


def main():
    if len(sys.argv) != 3:
        print("Usage: python scrape_mns_exercises.py input.json output.json")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, "r", encoding="utf-8") as f:
        exercises = json.load(f)

    enriched = []

    for ex in tqdm(exercises):
        url = ex.get("videoUrl", "")

        meta, final_url = parse_exercise(url)

        equipment = meta["equipment"].lower()
        is_bodyweight = (
            equipment == "bodyweight"
            or "bodyweight" in equipment
            or equipment == ""
        )

        enriched.append({
            "id": slugify_from_url(url) if url else "",
            "name": ex.get("name", ""),
            "bodyPart": meta["bodyPart"],
            "targetMuscles": meta["targetMuscles"],
            "secondaryMuscles": meta["secondaryMuscles"],
            "equipment": meta["equipment"],
            "instructions": meta["instructions"],
            "difficulty": meta["difficulty"],
            "isBodyweight": is_bodyweight,
            "videoUrl": final_url if final_url else ""
        })

        time.sleep(0.5)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(enriched)} exercises to {output_file}")


if __name__ == "__main__":
    main()
