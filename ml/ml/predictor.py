import os
import pickle
import numpy as np

class MLPredictor:
    def __init__(self, model_path="ml/models/classifier.pkl"):
        self.model = None
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)

    def predict(self, text: str) -> dict:
        if self.model is None:
            # No model file — return neutral default
            return {"label": "UNCERTAIN", "confidence": 0.5}
        try:
            prediction = self.model.predict([text])[0]
            proba = self.model.predict_proba([text])[0]
            confidence = float(np.max(proba))
            return {"label": str(prediction), "confidence": confidence}
        except Exception:
            return {"label": "UNCERTAIN", "confidence": 0.5}
