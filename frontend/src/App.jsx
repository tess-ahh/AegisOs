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

function Sparkline({ color, data }) {
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
  sparkColor,
  history,
  badgeText,
  badgeWarn,
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>

        <span className={`metric-badge ${badgeWarn ? "warn" : "up"}`}>
          {badgeText}
        </span>
      </div>

      <div className="metric-value">
        {value !== null ? value : "--"}
        <span>%</span>
      </div>

      <Sparkline
        color={sparkColor}
        data={history}
      />
    </div>
  );
}

function LogItem({ log }) {
  const type = LOG_TYPE(log);

  return (
    <li className={`log-item ${type}`}>
      <span className="log-tag">
        {LOG_TAG(log)}
      </span>

      <span className="log-msg">
        {LOG_MSG(log)}
      </span>
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

  const [processes, setProcesses] = useState([]);

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
      fetch(`${API}/processes`).then((r) => r.json()),
    ])
      .then(([statusData, metricsData, logsData, aiData, processData]) => {
        setStatus(statusData.status);

        setMetrics(metricsData);

        setLogs(logsData.logs);

        setAiStatus(aiData);

        setProcesses(processData.processes);

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
          max-width:1200px;
          margin:auto;
          padding:24px;
        }

        .topbar{
          display:flex;
          justify-content:space-between;
          margin-bottom:30px;
          align-items:center;
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
        }

        .metric-value{
          font-size:30px;
          font-weight:800;
          margin-top:10px;
        }

        .metric-value span{
          font-size:16px;
          color:#6b7280;
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
          margin-top:12px;
        }

        .log-item{
          display:flex;
          gap:10px;
          background:#0c0e14;
          padding:10px;
          border-radius:8px;
        }

        .log-tag{
          font-weight:700;
          color:#4f6ef7;
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

        .process-item{
          display:flex;
          justify-content:space-between;
          align-items:center;
          background:#0c0e14;
          padding:10px;
          border-radius:8px;
          margin-top:8px;
        }

        .danger{
          border:1px solid #ef4444;
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
          className={`panel ${
            aiStatus?.status === "ANOMALY DETECTED"
              ? "danger"
              : ""
          }`}
          style={{ marginBottom: "20px" }}
        >
          <h2>🧠 AI Threat Analysis</h2>

          <h1
            style={{
              marginTop: "10px",
              color:
                aiStatus?.status === "ANOMALY DETECTED"
                  ? "#ef4444"
                  : "#22c55e",
            }}
          >
            {aiStatus?.status || "SCANNING"}
          </h1>

          <p style={{ marginTop: "8px" }}>
            {aiStatus?.score || "Analyzing system"}
          </p>
        </div>

        <div className="metrics-grid">
          <MetricCard
            label="CPU Usage"
            value={metrics.cpu}
            sparkColor="#4f6ef7"
            history={cpuHistory.current}
            badgeText={metrics.cpu > 80 ? "HIGH" : "NORMAL"}
            badgeWarn={metrics.cpu > 80}
          />

          <MetricCard
            label="RAM Usage"
            value={metrics.ram}
            sparkColor="#a78bfa"
            history={ramHistory.current}
            badgeText={metrics.ram > 80 ? "HIGH" : "NORMAL"}
            badgeWarn={metrics.ram > 80}
          />

          <MetricCard
            label="Network Load"
            value={metrics.network}
            sparkColor="#34d399"
            history={netHistory.current}
            badgeText="ACTIVE"
            badgeWarn={false}
          />
        </div>

        <div className="bottom-grid">
          <div className="panel">
            <h3>📜 System Logs</h3>

            <ul className="log-list">
              {logs.map((log, i) => (
                <LogItem key={i} log={log} />
              ))}
            </ul>
          </div>

          <div className="panel">
            <h3>📊 Resource Overview</h3>

            <div
              style={{
                display:"flex",
                alignItems:"center",
                gap:"20px",
                marginTop:"20px"
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

        <div className="panel" style={{ marginTop: "12px" }}>
          <h3>💻 Terminal</h3>

          <div
            style={{
              display:"flex",
              gap:"10px",
              marginTop:"12px",
              marginBottom:"16px"
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
              display:"flex",
              flexDirection:"column",
              gap:"8px"
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

        <div className="panel" style={{ marginTop: "12px" }}>
          <h3>🖥 Active Processes</h3>

          <div style={{ marginTop: "12px" }}>
            {processes.map((proc, i) => (
              <div
                key={i}
                className="process-item"
              >
                <span>
                  #{proc.pid}
                </span>

                <span>
                  {proc.name}
                </span>

                <span>
                  RAM {proc.memory}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}