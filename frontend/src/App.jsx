import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const API = "http://127.0.0.1:8000";
const HISTORY_MAX = 20;

const LOG_TYPE = (log) => {
  if (log.startsWith("[WARN]")) return "warn";
  if (log.startsWith("[AI]")) return "ai";
  if (log.startsWith("[SCAN]")) return "scan";
  if (log.startsWith("[ERROR]")) return "warn";
  return "info";
};

const LOG_TAG = (log) => {
  const match = log.match(/^\[([A-Z]+)\]/);
  return match ? match[1] : "INFO";
};

const LOG_MSG = (log) => log.replace(/^\[[A-Z]+\]\s*/, "");

function useClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const n = new Date();

      setTime(
        [n.getHours(), n.getMinutes(), n.getSeconds()]
          .map((v) => String(v).padStart(2, "0"))
          .join(":")
      );
    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, []);

  return time;
}

function Sparkline({ id, color, data }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    instanceRef.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels: Array(HISTORY_MAX).fill(""),
        datasets: [
          {
            data: Array(HISTORY_MAX).fill(null),
            borderColor: color,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            backgroundColor: color + "18",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            display: false,
            min: 0,
            max: 100,
          },
        },
        animation: false,
      },
    });

    return () => instanceRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!instanceRef.current || data.length === 0) return;

    const padded = Array(HISTORY_MAX - data.length)
      .fill(null)
      .concat(data);

    instanceRef.current.data.datasets[0].data = padded;
    instanceRef.current.update("none");
  }, [data]);

  return (
    <div style={{ height: 36, marginTop: 10 }}>
      <canvas ref={chartRef} />
    </div>
  );
}

function DonutChart({ cpu, ram, net }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    instanceRef.current = new Chart(chartRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [cpu || 33, ram || 33, net || 34],
            backgroundColor: ["#4f6ef7", "#a78bfa", "#34d399"],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });

    return () => instanceRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;

    instanceRef.current.data.datasets[0].data = [
      cpu || 0,
      ram || 0,
      net || 0,
    ];

    instanceRef.current.update();
  }, [cpu, ram, net]);

  return (
    <div
      style={{
        position: "relative",
        width: 140,
        height: 140,
      }}
    >
      <canvas ref={chartRef} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  colorClass,
  iconClass,
  sparkId,
  sparkColor,
  history,
  badgeText,
  badgeWarn,
}) {
  return (
    <div className={`metric-card ${colorClass}`}>
      <div className="metric-top">
        <div className={`metric-icon ${colorClass}`}>
          <i className={`ti ${iconClass}`} />
        </div>

        <span className={`metric-badge ${badgeWarn ? "warn" : "up"}`}>
          {badgeText}
        </span>
      </div>

      <div className="metric-label">{label}</div>

      <div className="metric-value">
        {value !== null ? value : "--"}
        <span>%</span>
      </div>

      <Sparkline
        id={sparkId}
        color={sparkColor}
        data={history}
      />
    </div>
  );
}

function LogItem({ log }) {
  const type = LOG_TYPE(log);
  const tag = LOG_TAG(log);
  const msg = LOG_MSG(log);

  const now = new Date();

  const time = [now.getHours(), now.getMinutes()]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");

  return (
    <li className={`log-item ${type}`}>
      <span className="log-tag">{tag}</span>
      <span className="log-msg">{msg}</span>
      <span className="log-time">{time}</span>
    </li>
  );
}

export default function App() {
  const clock = useClock();

  const [status, setStatus] = useState(null);

  const [metrics, setMetrics] = useState({
    cpu: null,
    ram: null,
    network: null,
  });

  const [logs, setLogs] = useState([]);

  const [command, setCommand] = useState("");

  const [terminalOutput, setTerminalOutput] = useState([]);

  const [error, setError] = useState(false);

  const [aiStatus, setAiStatus] = useState(null);

  const cpuHistory = useRef([]);
  const ramHistory = useRef([]);
  const netHistory = useRef([]);

  const [, forceUpdate] = useState(0);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API}/`).then((r) => r.json()),
      fetch(`${API}/metrics`).then((r) => r.json()),
      fetch(`${API}/logs`).then((r) => r.json()),
      fetch(`${API}/ai-status`).then((r) => r.json()),
    ])
      .then(([statusData, metricsData, logsData, aiData]) => {
        setStatus(statusData.status);

        setMetrics(metricsData);

        setLogs(logsData.logs);

        setAiStatus(aiData);

        setError(false);

        const push = (arr, val) => {
          arr.push(val);

          if (arr.length > HISTORY_MAX) {
            arr.shift();
          }
        };

        push(cpuHistory.current, metricsData.cpu);
        push(ramHistory.current, metricsData.ram);
        push(netHistory.current, metricsData.network);

        forceUpdate((n) => n + 1);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    fetchData();

    const id = setInterval(fetchData, 1500);

    return () => clearInterval(id);
  }, [fetchData]);

  const runCommand = () => {
    fetch(`${API}/command/${command}`)
      .then((res) => res.json())
      .then((data) => {
        setTerminalOutput(data.output);
      });
  };

  const avg =
    metrics.cpu && metrics.ram && metrics.network
      ? Math.round(
          (metrics.cpu + metrics.ram + metrics.network) / 3
        )
      : null;

  return (
    <>
      <style>{`
        body{
          background:#07080c;
          color:white;
          font-family:sans-serif;
        }

        .root{
          max-width:1100px;
          margin:auto;
          padding:24px;
        }

        .topbar{
          display:flex;
          justify-content:space-between;
          margin-bottom:30px;
        }

        .metrics-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          margin-bottom:20px;
        }

        .metric-card,.panel{
          background:#10121a;
          border:1px solid #1b1e2e;
          border-radius:12px;
          padding:18px;
        }

        .metric-top{
          display:flex;
          justify-content:space-between;
          margin-bottom:10px;
        }

        .metric-value{
          font-size:30px;
          font-weight:800;
        }

        .metric-label{
          color:#6b7280;
          margin-bottom:5px;
        }

        .metric-badge.up{
          color:#22c55e;
        }

        .metric-badge.warn{
          color:#fbbf24;
        }

        .bottom-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .log-list{
          display:flex;
          flex-direction:column;
          gap:8px;
          list-style:none;
        }

        .log-item{
          display:flex;
          gap:8px;
          background:#0c0e14;
          padding:8px;
          border-radius:8px;
        }

        .log-tag{
          font-weight:700;
        }

        .log-msg{
          flex:1;
          color:#9ca3af;
        }

        .terminal-input{
          flex:1;
          background:#0c0e14;
          border:1px solid #1b1e2e;
          border-radius:8px;
          padding:12px;
          color:white;
        }

        .terminal-button{
          background:#4f6ef7;
          border:none;
          color:white;
          padding:12px 18px;
          border-radius:8px;
          cursor:pointer;
        }

        @media(max-width:700px){
          .metrics-grid{
            grid-template-columns:1fr;
          }

          .bottom-grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="root">
        <div className="topbar">
          <h1>AegisOS</h1>

          <div>
            {error ? "BACKEND OFFLINE" : "SYSTEM ONLINE"} | {clock}
          </div>
        </div>

        <div
          className="panel"
          style={{
            marginBottom: "20px",
            border:
              aiStatus?.status === "ANOMALY DETECTED"
                ? "1px solid #ef4444"
                : "1px solid #1b1e2e",
            background:
              aiStatus?.status === "ANOMALY DETECTED"
                ? "rgba(239,68,68,0.08)"
                : "#10121a",
          }}
        >
          <div className="panel-header">
            <span className="panel-title">
              🧠 AI Threat Analysis
            </span>

            <span
              style={{
                color:
                  aiStatus?.status === "ANOMALY DETECTED"
                    ? "#ef4444"
                    : "#22c55e",
              }}
            >
              {aiStatus?.score || "SCANNING"}
            </span>
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: "800",
              marginTop: "10px",
              color:
                aiStatus?.status === "ANOMALY DETECTED"
                  ? "#ef4444"
                  : "#22c55e",
            }}
          >
            {aiStatus?.status || "Initializing AI Engine..."}
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard
            label="CPU Usage"
            value={metrics.cpu}
            colorClass="cpu"
            iconClass="ti-cpu"
            sparkId="cpuSpark"
            sparkColor="#4f6ef7"
            history={cpuHistory.current}
            badgeText={metrics.cpu > 80 ? "HIGH" : "NORMAL"}
            badgeWarn={metrics.cpu > 80}
          />

          <MetricCard
            label="RAM Usage"
            value={metrics.ram}
            colorClass="ram"
            iconClass="ti-device-desktop-analytics"
            sparkId="ramSpark"
            sparkColor="#a78bfa"
            history={ramHistory.current}
            badgeText={metrics.ram > 80 ? "HIGH" : "NORMAL"}
            badgeWarn={metrics.ram > 80}
          />

          <MetricCard
            label="Network Load"
            value={metrics.network}
            colorClass="net"
            iconClass="ti-wifi"
            sparkId="netSpark"
            sparkColor="#34d399"
            history={netHistory.current}
            badgeText="ACTIVE"
            badgeWarn={false}
          />
        </div>

        <div className="bottom-grid">
          <div className="panel">
            <h3>System Logs</h3>

            <ul className="log-list">
              {logs.map((log, i) => (
                <LogItem key={i} log={log} />
              ))}
            </ul>
          </div>

          <div className="panel">
            <h3>Resource Overview</h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <DonutChart
                cpu={metrics.cpu}
                ram={metrics.ram}
                net={metrics.network}
              />

              <div>
                <p>CPU: {metrics.cpu}%</p>
                <p>RAM: {metrics.ram}%</p>
                <p>NET: {metrics.network}%</p>
                <p>AVG: {avg}%</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{ marginTop: "12px" }}
        >
          <h3>Terminal</h3>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "12px",
              marginBottom: "16px",
            }}
          >
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="scan network"
              className="terminal-input"
            />

            <button
              onClick={runCommand}
              className="terminal-button"
            >
              RUN
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {terminalOutput.length === 0 ? (
              <div className="log-item">
                <span className="log-msg">
                  Terminal ready...
                </span>
              </div>
            ) : (
              terminalOutput.map((line, i) => (
                <div
                  key={i}
                  className={`log-item ${LOG_TYPE(line)}`}
                >
                  <span className="log-tag">
                    {LOG_TAG(line)}
                  </span>

                  <span className="log-msg">
                    {LOG_MSG(line)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}