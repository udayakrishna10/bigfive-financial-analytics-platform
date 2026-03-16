import pandas as pd
import numpy as np
import json
df = pd.DataFrame([{"val": np.nan}, {"val": 1.5}])
records = df.astype(object).where(pd.notnull(df), None).to_dict(orient="records")
print("Python dict:", records)
print("JSON:", json.dumps(records))
