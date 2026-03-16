import pandas as pd
import numpy as np
from fastapi.encoders import jsonable_encoder
import json
df = pd.DataFrame([{"val": np.nan}, {"val": 1.5}])
dict_data = df.to_dict(orient="records")
print("Python dict:", dict_data)
encoded = jsonable_encoder(dict_data)
print("Encoded:", encoded)
try:
    print("JSON:", json.dumps(encoded))
except Exception as e:
    print("JSON Error:", e)
