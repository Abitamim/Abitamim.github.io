import pandas as pd
import json
import os

hospital_file = open("hospital.json")
data = json.load(hospital_file)

hospital_data = pd.json_normalize(data["value"])
output_file = open("hospital_name_id.js", "w")
output_file.write('let hospitalNames = [')
for name in hospital_data["Name"].to_list():
    output_file.write('"' + name + '",')
    
output_file.seek(output_file.tell() - 1, os.SEEK_SET)
output_file.write('];\n')

output_file.write('let hospitalIds = {')
for name, id in zip(hospital_data["Name"].to_list(), hospital_data["Id"].to_list()):
    output_file.write(f'"{name}": "{id}",')
    
output_file.seek(output_file.tell() - 1, os.SEEK_SET)
output_file.write('};\n')
output_file.close()