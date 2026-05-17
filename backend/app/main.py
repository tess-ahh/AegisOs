from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import psutil

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
def get_metrics():

    cpu = psutil.cpu_percent(interval=0.5)

    ram = psutil.virtual_memory().percent

    network = psutil.net_io_counters().bytes_sent / 1000000

    network = min(int(network % 100), 100)

    return {
        "cpu": int(cpu),
        "ram": int(ram),
        "network": int(network)
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