

import csv
import json

def generate_gsl_js(csv_file_path, js_file_path):
    words = []
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            if len(row) > 1:
                # Assuming the word is in the second column (index 1)
                word = row[1].strip()
                words.append(word)

    # Format into a JavaScript array string
    js_content = f"module.exports = {json.dumps(words, indent=2)};"

    with open(js_file_path, 'w', encoding='utf-8') as jsfile:
        jsfile.write(js_content)

    print(f"Successfully generated {js_file_path} with {len(words)} words.")

if __name__ == "__main__":
    # Assuming GSL.csv is in the same directory
    generate_gsl_js('C:\Users\User\Documents\ab_gemini\ESL_Student_Tracker\GSL.csv', 'C:\Users\User\Documents\ab_gemini\ESL_Student_Tracker\gsl-words.js')

