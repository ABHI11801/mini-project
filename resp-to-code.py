import re
import ast
import json
import os
import sys

input_data = json.loads(sys.argv[1])
print(input_data)
generated_code = input_data.get("generatedCode", "")
match = re.search(r'```json\n(.*?)\n```', generated_code, re.DOTALL)

if not match:
    print("No valid JSON code block found.")
    sys.exit(1)

json_content = match.group(1)

try:
    file_data = json.loads(json_content)
except json.JSONDecodeError as e:
    print(f"Error parsing JSON: {e}")
    sys.exit(1)

output_folder = 'output'
os.makedirs(output_folder, exist_ok=True)

for filename, content in file_data.items():
    if filename.endswith(('.jpg', '.png')):
        print(f"Skipping image placeholder: {filename}")
        continue

    filepath = os.path.join(output_folder, filename)
    with open(filepath, 'w', encoding='utf-8') as file:
        file.write(content)
    filepath = os.path.join(output_folder, 'content.txt')
    with open(filepath, 'w', encoding='utf-8') as file:
        file.write(generated_code)
    print(f"{filename} written successfully.")
