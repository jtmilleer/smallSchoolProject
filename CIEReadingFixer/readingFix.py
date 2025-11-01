import os
import csv

# Folders to process
reading_folders = ["reading4", "reading5", "reading6"]

# Output folder
output_folder = "out"
os.makedirs(output_folder, exist_ok=True)

for folder in reading_folders:
    print(f"Processing {folder}...")

    # File paths
    error_file = os.path.join(folder, f"{folder}Errors.csv")
    scores_file = os.path.join(folder, f"{folder}Scores.csv")

    if not (os.path.exists(error_file) and os.path.exists(scores_file)):
        print(f"Skipping {folder} — missing files.")
        continue

    # --- Step 1: Read students with errors ---
    error_students = set()
    with open(error_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            last = row['Last'].strip().lower()
            first = row['First'].strip().lower()
            error_students.add((last, first))

    # --- Step 2: Find the correct "Participation total (...)" column ---
    matched_students = []
    with open(scores_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        # Find the column that starts with "Participation total ("
        participation_col = next(
            (col for col in fieldnames if col.startswith("Participation total (")), None
        )

        if participation_col is None:
            print(f"Couldn't find Participation total (...) column in {scores_file}")
            continue

        for row in reader:
            last = row['Last name'].strip().lower()
            first = row['First name'].strip().lower()
            if (last, first) in error_students:
                matched_students.append({
                    'Last': row['Last name'],
                    'First': row['First name'],
                    'Participation Total': row[participation_col]
                })

    # --- Step 3: Write results ---
    output_file = os.path.join(output_folder, f"{folder}_error_scores.csv")
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Last', 'First', 'Participation Total']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(matched_students)

    print(f"{folder}: {len(matched_students)} matches written to {output_file}")

print("\nAll readings processed successfully!")
