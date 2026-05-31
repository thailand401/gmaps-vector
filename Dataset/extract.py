import json
import re

def is_location_array(arr):
    """Check if array has pattern [null, null, number, number]"""
    if not isinstance(arr, list) or len(arr) != 4:
        return False
    return (arr[0] is None and arr[1] is None and 
            isinstance(arr[2], (int, float)) and isinstance(arr[3], (int, float)))

def is_useful_string(s):
    """Filter out non-useful strings like numbers, hex, hashes, locales, URLs"""
    if not isinstance(s, str) or len(s) == 0:
        return False
    
    # Skip URLs and paths
    if s.startswith('http://') or s.startswith('https://') or 'http' in s.lower():
        return False
    if s.startswith('/') and len(s) > 1 and (s[1].isalpha() or s[1:].startswith('g/')):
        # Skip paths like /g/11cnd5xdhm
        return False
    
    # Skip locale/timezone (Asia/Saigon, vi, en, VN, English, etc)
    locale_patterns = [
        r'^[a-z]{2}$',  # language codes like 'vi', 'en'
        r'^[A-Z]{2}$',  # country codes like 'VN'
        r'^[A-Z][a-z]+$',  # English, Chinese, etc
        r'^[A-Za-z]+/[A-Za-z_]+$',  # timezone like 'Asia/Saigon'
    ]
    for pattern in locale_patterns:
        if re.match(pattern, s):
            return False
    
    # Skip pure numbers (including floats and large numbers)
    if re.match(r'^-?\d+(\.\d+)?$', s):
        return False
    
    # Skip hex codes (0x... or 0x...:0x...)
    if re.match(r'^0x[0-9a-fA-F:]+$', s):
        return False
    
    # Skip hash-like strings (long alphanumeric with special chars like colons/dashes)
    # Google place IDs and similar
    if re.match(r'^[0-9a-zA-Z_-]+:[0-9a-zA-Z_-]+$', s):
        return False
    
    # Skip long base64-like or encoded strings (50+ chars of alphanumeric+/+=)
    if re.match(r'^[A-Za-z0-9+/=_-]{50,}$', s):
        return False
    
    # Skip strings that look like tokens (20+ chars of alphanumeric+special)
    if len(s) > 20 and not ' ' in s:
        if re.match(r'^[A-Za-z0-9_-]{20,}$', s):
            return False
    
    # If it passes all filters, it's useful
    return True

def extract_locations(data, parent=None, parent_index=None):
    """Recursively traverse JSON and find location arrays"""
    results = []
    
    if isinstance(data, list):
        for i, item in enumerate(data):
            # Check if current item is location array
            if is_location_array(item):
                # Get all useful strings from parent array
                if isinstance(parent, list):
                    strings_in_parent = [s for s in parent if is_useful_string(s)]
                    if strings_in_parent:
                        name = " | ".join(strings_in_parent)
                        lat = item[2]
                        lon = item[3]
                        results.append({
                            "name": name,
                            "latitude": lat,
                            "longitude": lon,
                            "strings_found": strings_in_parent
                        })
            # Recurse into nested structures
            results.extend(extract_locations(item, parent=data, parent_index=i))
    
    elif isinstance(data, dict):
        for key, value in data.items():
            results.extend(extract_locations(value, parent=data, parent_index=key))
    
    return results

# Load JSON
with open("bvoutput.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Extract locations
locations = extract_locations(data)

# Save results
with open("bvlocations.json", "w", encoding="utf-8") as f:
    json.dump(locations, f, ensure_ascii=False, indent=2)

print(f"Found {len(locations)} locations")
for loc in locations[:10]:  # Show first 10
    print(f"  {loc['name']}: ({loc['latitude']}, {loc['longitude']})")

if len(locations) > 10:
    print(f"  ... and {len(locations) - 10} more")
