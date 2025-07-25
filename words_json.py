import re
import json

def process_gsl_file():
    try:
        # Read the CSV file
        with open('GSL.csv', 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Use regex to extract only the words (remove numbers and commas)
        # This pattern looks for the comma and captures everything after it until the end of line or next number
        words = re.findall(r'\d+,(.+?)(?=\n\d+|$)', content)
        
        # Clean each word by removing any remaining numbers or commas
        cleaned_words = []
        for word in words:
            # Remove any remaining numbers and commas
            clean_word = re.sub(r'[\d,]', '', word).strip()
            if clean_word:  # Only add non-empty words
                cleaned_words.append(clean_word)
        
        # Create properly formatted JSON
        json_content = json.dumps(cleaned_words, indent=2)
        
        # Create the JavaScript file with the JSON data
        js_content = f"const gslWords = {json_content};\n\nexport default gslWords;"
        
        # Save to gsl-words2.js
        with open('gsl-words2.js', 'w', encoding='utf-8') as output_file:
            output_file.write(js_content)
        
        print(f"Successfully processed {len(cleaned_words)} words from GSL.csv")
        print("Output saved to gsl-words2.js")
        
    except FileNotFoundError:
        print("Error: GSL.csv file not found!")
    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == "__main__":
    process_gsl_file()