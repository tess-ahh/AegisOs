from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "AegisOS backend alive ⚡"}

@app.get("/metrics")
def metrics():
    return {
        "cpu": random.randint(10, 90),
        "ram": random.randint(20, 95),
        "network": random.randint(1, 100)
    }

@app.get("/logs")
def logs():
    return {
        "logs": [
            "system boot completed",
            "firewall initialized",
            "ai module standby",
            "network scan running",
            "no threats detected"
        ]
    }