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

    sample_logs = [
        "[INFO] firewall initialized",
        "[INFO] network monitoring active",
        "[WARN] suspicious packet detected",
        "[AI] anomaly confidence 82%",
        "[INFO] cpu balancing enabled",
        "[SCAN] port scan completed",
        "[INFO] memory optimization active"
    ]

    return {
        "logs": random.sample(sample_logs, 5)
    }
@app.get("/command/{cmd}")
def command(cmd: str):

    responses = {
        "scan network": [
            "[SCAN] checking active hosts...",
            "[SCAN] scanning ports...",
            "[INFO] 12 devices detected"
        ],

        "run diagnostics": [
            "[INFO] cpu stable",
            "[INFO] memory healthy",
            "[INFO] no system failures detected"
        ],

        "show threats": [
            "[WARN] suspicious packet activity",
            "[AI] anomaly score: 82%",
            "[ALERT] possible intrusion attempt"
        ],

        "clear logs": [
            "[SYSTEM] logs cleared"
        ]
    }

    return {
        "output": responses.get(
            cmd.lower(),
            ["[ERROR] unknown command"]
        )
    }