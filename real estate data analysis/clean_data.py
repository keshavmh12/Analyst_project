import pandas as pd
import re
import json
import os

def parse_size(val):
    if pd.isna(val):
        return None
    val_str = str(val).strip().lower()
    # Remove everything except numbers, decimal points, and hyphens
    val_str = re.sub(r'[^0-9.\-]', '', val_str)
    if not val_str:
        return None
    if '-' in val_str:
        parts = val_str.split('-')
        try:
            val1 = float(parts[0])
            val2 = float(parts[1])
            return round((val1 + val2) / 2, 2)
        except:
            pass
    try:
        return round(float(val_str), 2)
    except:
        return None

def clean_dataset():
    csv_path = r"c:\Users\Admin\Desktop\Kesh\OneDrive\Desktop\data analytics\real estate data analysis\real_estate_dataset.csv"
    json_path = r"c:\Users\Admin\Desktop\Kesh\OneDrive\Desktop\data analytics\real estate data analysis\real_estate_data.json"
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return
        
    df = pd.read_csv(csv_path)
    
    # 1. Clean price
    # Standardize values: if < 1000, multiply by 1,000,000 (millions/lakhs correction)
    def clean_price(p):
        if pd.isna(p):
            return None
        p_val = float(p)
        if p_val < 1000:
            return float(p_val * 1000000)
        return float(p_val)
        
    df['cleaned_price'] = df['price'].apply(clean_price)
    
    # 2. Clean size
    df['cleaned_size'] = df['clean Size'].apply(parse_size)
    
    # 3. Clean baths
    def clean_baths(b):
        if pd.isna(b):
            return None
        return float(b)
    df['cleaned_baths'] = df['baths'].apply(clean_baths)
    
    # 4. Clean beds
    def clean_beds(b):
        try:
            return int(b)
        except:
            return 0
    df['cleaned_beds'] = df['beds'].apply(clean_beds)
    
    # 5. Clean string fields
    df['city'] = df['city'].astype(str).str.strip()
    df['type'] = df['type'].astype(str).str.strip()
    df['neighborhood'] = df['neighborhood'].astype(str).str.strip()
    
    # 6. Parse and sort by date
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df.dropna(subset=['Date']) # Drop rows with invalid dates if any
    df = df.sort_values('Date')
    df['Date_str'] = df['Date'].dt.strftime('%Y-%m-%d')
    
    # Create final records
    cleaned_records = []
    for _, row in df.iterrows():
        cleaned_records.append({
            'beds': int(row['cleaned_beds']) if not pd.isna(row['cleaned_beds']) else 0,
            'baths': float(row['cleaned_baths']) if not pd.isna(row['cleaned_baths']) else None,
            'city': str(row['city']),
            'date': str(row['Date_str']),
            'size': float(row['cleaned_size']) if not pd.isna(row['cleaned_size']) else None,
            'type': str(row['type']),
            'neighborhood': str(row['neighborhood']),
            'price': float(row['cleaned_price']) if not pd.isna(row['cleaned_price']) else None
        })
        
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_records, f, indent=2, ensure_ascii=False)
        
    print(f"Success! Cleaned {len(cleaned_records)} records and saved to {json_path}")
    
    # Let's print some summary stats
    print("Cleaned Summary Stats:")
    print(f"Total Rows: {len(df)}")
    print(f"Rows with Null Price: {df['cleaned_price'].isna().sum()}")
    print(f"Rows with Null Size: {df['cleaned_size'].isna().sum()}")
    print(f"Average Price: {df['cleaned_price'].mean():,.2f}")
    print(f"Average Size: {df['cleaned_size'].mean():,.2f}")
    print(f"Average Beds: {df['cleaned_beds'].mean():.2f}")
    print(f"Average Baths: {df['cleaned_baths'].mean():.2f}")

if __name__ == "__main__":
    clean_dataset()
