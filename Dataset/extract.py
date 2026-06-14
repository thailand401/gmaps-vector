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
        return False
    
    # Skip locale/timezone (Asia/Saigon, vi, en, VN, English, etc)
    locale_patterns = [
        r'^[a-z]{2}$',
        r'^[A-Z]{2}$',
        r'^[A-Z][a-z]+$',
        r'^[A-Za-z]+/[A-Za-z_]+$',
    ]
    for pattern in locale_patterns:
        if re.match(pattern, s):
            return False
    
    # Skip pure numbers
    if re.match(r'^-?\d+(\.\d+)?$', s):
        return False
    
    # Skip hex codes
    if re.match(r'^0x[0-9a-fA-F:]+$', s):
        return False
    
    # Skip hash-like strings
    if re.match(r'^[0-9a-zA-Z_-]+:[0-9a-zA-Z_-]+$', s):
        return False
    
    # Skip long base64-like encoded strings
    if re.match(r'^[A-Za-z0-9+/=_-]{50,}$', s):
        return False
    
    # Skip tokens
    if len(s) > 20 and ' ' not in s:
        if re.match(r'^[A-Za-z0-9_-]{20,}$', s):
            return False
    
    return True


def _count_address_criteria(s):
    """Count how many address criteria the string matches."""
    count = 0

    # 1. number: house/street number at start or after comma/space, or Google Plus code
    if re.search(r'(^|[\s,])\d[\dA-Za-z\-/]*[\s,]', s) or re.match(r'^[A-Z0-9]{4}\+[A-Z0-9]{2,}', s):
        count += 1

    # 2. street name keywords (Vietnamese + English)
    street_kw = [
        r'\bĐ\.', r'\bĐường\b', r'\bPhố\b', r'\bHẻm\b', r'\bNgõ\b',
        r'\bNgách\b', r'\bLộ\b', r'\bHL\d',
        r'\bStreet\b', r'\bSt\.', r'\bAvenue\b', r'\bAve\b',
        r'\bRoad\b', r'\bRd\.', r'\bBlvd\b', r'\bLane\b',
    ]
    if any(re.search(p, s, re.IGNORECASE) for p in street_kw):
        count += 1

    # 3. district/ward keywords
    district_kw = [r'\bPhường\b', r'\bQuận\b', r'\bHuyện\b',
                   r'\bThị\s+[Xx]ã\b', r'\bThị\s+[Tt]rấn\b']
    if any(re.search(p, s) for p in district_kw):
        count += 1

    # 4. city names
    city_kw = [r'\bHồ\s+Chí\s+Minh\b', r'\bHo\s+Chi\s+Minh\b',
               r'\bHà\s+Nội\b', r'\bHanoi\b', r'\bĐà\s+Nẵng\b', r'\bDa\s+Nang\b']
    if any(re.search(p, s, re.IGNORECASE) for p in city_kw):
        count += 1

    # 5. country
    if re.search(r'\bVietnam\b|\bViệt\s+Nam\b', s, re.IGNORECASE):
        count += 1

    # 6. postcode: standalone 5-6 digit number
    if re.search(r'(?<!\d)\d{5,6}(?!\d)', s):
        count += 1

    return count


def is_address_string(s):
    """A string is an address if it matches at least 2 address criteria."""
    return _count_address_criteria(s) >= 2

def format_address(addr):
    """Clean address string: split by comma, remove Plus Code parts, remove postcode, remove 'Đ.'"""
    if not addr:
        return addr
    parts = [p.strip() for p in addr.split(',')]
    cleaned = []
    for part in parts:
        # Skip Google Plus Code parts (e.g. "QJ73+86P", "QJQH+X8F")
        if re.match(r'^[A-Z0-9]{4}\+[A-Z0-9]{2,}(\s.*)?$', part):
            continue
        # Remove postcode (standalone 5-6 digit number within part)
        part = re.sub(r'\b\d{5,6}\b', '', part).strip().strip(',').strip()
        # Remove "Đ." prefix on street names
        part = re.sub(r'\bĐ\.\s*', '', part).strip()
        if part:
            cleaned.append(part)
    return ', '.join(cleaned)


def pick_best_address(addresses):
    """Pick best address: if 3 items → middle by length; if 2 → longest; if 1 → that one."""
    if not addresses:
        return None
    if len(addresses) == 1:
        return addresses[0]
    if len(addresses) == 2:
        return max(addresses, key=len)
    # 3+ items: sort by length, pick the middle one
    sorted_by_len = sorted(addresses, key=len)
    return sorted_by_len[len(sorted_by_len) // 2]


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
                        # Classify: strings with >=2 address criteria go to "address"
                        address = [s for s in strings_in_parent if is_address_string(s)]
                        other   = [s for s in strings_in_parent if not is_address_string(s)]
                        entry = {
                            "name": name,
                            "latitude": lat,
                            "longitude": lon,
                            "strings_found": other,
                        }
                        if address:
                            entry["address"] = format_address(pick_best_address(address))
                        results.append(entry)
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

# Save items with address to a separate file
with_address = [loc for loc in locations if loc.get('address')]
with open("bvlocations_addressed.json", "w", encoding="utf-8") as f:
    json.dump(with_address, f, ensure_ascii=False, indent=2)

print(f"\nItems with address: {len(with_address)} → bvlocations_addressed.json")
