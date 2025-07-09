# lis_cdss/inference/model_registry.py

_model_map = {}

def load_model(key, model):
    _model_map[key] = model

def get_model(key):
    return _model_map.get(key)

def get_all_models():
    return _model_map
