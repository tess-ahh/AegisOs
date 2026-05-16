from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"status": "AegisOS backend alive ⚡"}