#!/usr/bin/env python3
import json
import csv

# Read the JSON file
with open('intent.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract categories
categories = []
for idx, category_data in enumerate(data['data'], start=1):
    categories.append({
        'id': idx,
        'category_id': category_data['category_id'],
        'category': category_data['category']
    })

# Extract intents
intents = []
intent_id = 1
for category_data in data['data']:
    for intent_data in category_data['intents']:
        intents.append({
            'id': intent_id,
            'intent': intent_data['intent'],
            'description': intent_data['description'],
            'priority': intent_data['priority'],
            'category_id': intent_data['category_id']
        })
        intent_id += 1

# Write categories.csv
with open('categories.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['id', 'category_id', 'category'])
    writer.writeheader()
    writer.writerows(categories)

print(f"✓ Created categories.csv with {len(categories)} categories")

# Write intents.csv
with open('intents.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['id', 'intent', 'description', 'priority', 'category_id'])
    writer.writeheader()
    writer.writerows(intents)

print(f"✓ Created intents.csv with {len(intents)} intents")
