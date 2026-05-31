import json

with open("locations.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total locations: {len(data)}")
