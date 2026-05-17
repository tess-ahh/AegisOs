import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const API = "http://127.0.0.1:8000";
const HISTORY_MAX = 20;

const LOG_TYPE = (log) => {
  if (log.startsWith("[WARN]")) return "warn";
  if (log.startsWith("[AI]")) return "ai";
  if (log.startsWith("[SCAN]")) return "scan";
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
      <canvas
        id={id}
        ref={chartRef}
        role="img"
        aria-label={`${id} sparkline`}
      />
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
        animation: {
          duration: 400,
        },
      },
    });

    return () => instanceRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!instanceRef.current || (!cpu && !ram && !net)) return;

    instanceRef.current.data.datasets[0].data = [cpu, ram, net];
    instanceRef.current.update();
  }, [cpu, ram, net]);

  return (
    <div
      style={{
        position: "relative",
        width: 140,
        height: 140,
        flexShrink: 0,
      }}
    >
      <canvas
        ref={chartRef}
        role="img"
        aria-label="Donut chart showing CPU, RAM, and Network resource distribution"
      />
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
          <i className={`ti ${iconClass}`} aria-hidden="true" />
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

  const cpuHistory = useRef([]);
  const ramHistory = useRef([]);
  const netHistory = useRef([]);

  const [, forceUpdate] = useState(0);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API}/`).then((r) => r.json()),
      fetch(`${API}/metrics`).then((r) => r.json()),
      fetch(`${API}/logs`).then((r) => r.json()),
    ])
      .then(([statusData, metricsData, logsData]) => {
        setStatus(statusData.status);
        setMetrics(metricsData);
        setLogs(logsData.logs);

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
    fetch(`http://127.0.0.1:8000/command/${command}`)
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
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #07080c;
          color: #e2e4ea;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }

        .root {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 24px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #4f6ef7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-mark i {
          font-size: 20px;
          color: #fff;
        }

        .logo-name {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
        }

        .logo-sub {
          font-size: 11px;
          color: #4b5563;
          font-family: 'Space Mono', monospace;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 20px;
          padding: 5px 14px;
        }

        .status-pill.error {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .status-dot.error {
          background: #ef4444;
        }

        .status-text {
          font-size: 12px;
          color: #22c55e;
          font-family: 'Space Mono', monospace;
        }

        .status-text.error {
          color: #ef4444;
        }

        .clock {
          font-size: 11px;
          color: #374151;
          font-family: 'Space Mono', monospace;
        }

        .section-label {
          font-size: 10px;
          font-weight: 700;
          color: #374151;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: #10121a;
          border: 1px solid #1b1e2e;
          border-radius: 12px;
          padding: 18px;
        }

        .metric-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .metric-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon.cpu {
          background: rgba(79,110,247,0.14);
        }

        .metric-icon.ram {
          background: rgba(167,139,250,0.14);
        }

        .metric-icon.net {
          background: rgba(52,211,153,0.14);
        }

        .metric-badge {
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .metric-badge.up {
          background: rgba(34,197,94,0.1);
          color: #22c55e;
        }

        .metric-badge.warn {
          background: rgba(251,191,36,0.1);
          color: #fbbf24;
        }

        .metric-label {
          font-size: 11px;
          color: #4b5563;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 30px;
          font-weight: 800;
        }

        .metric-value span {
          font-size: 14px;
          color: #4b5563;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .panel {
          background: #10121a;
          border: 1px solid #1b1e2e;
          border-radius: 12px;
          padding: 20px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .panel-title {
          font-size: 13px;
          font-weight: 700;
          color: #c9cdd9;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .panel-action {
          font-size: 11px;
          color: #4f6ef7;
        }

        .log-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .log-item {
          display: flex;
          gap: 8px;
          font-size: 11px;
          padding: 8px 10px;
          border-radius: 7px;
          background: #0c0e14;
        }

        .log-tag {
          font-weight: 700;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 3px;
          min-width: 40px;
          text-align: center;
        }

        .log-item.info .log-tag {
          color: #4f6ef7;
          background: rgba(79,110,247,0.1);
        }

        .log-item.warn .log-tag {
          color: #fbbf24;
          background: rgba(251,191,36,0.1);
        }

        .log-item.ai .log-tag {
          color: #a78bfa;
          background: rgba(167,139,250,0.1);
        }

        .log-item.scan .log-tag {
          color: #34d399;
          background: rgba(52,211,153,0.1);
        }

        .log-msg {
          color: #9ca3af;
          flex: 1;
        }

        .log-time {
          font-size: 9px;
          color: #2d3748;
        }

        .donut-wrap {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .legend-item {
          display: flex;
          justify-content: space-between;
        }

        .legend-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .legend-val {
          font-size: 11px;
          font-weight: 700;
        }

        .terminal-input {
          flex: 1;
          background: #0c0e14;
          border: 1px solid #1b1e2e;
          border-radius: 8px;
          padding: 12px;
          color: #e2e4ea;
          outline: none;
        }

        .terminal-button {
          background: #4f6ef7;
          border: none;
          border-radius: 8px;
          padding: 12px 18px;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="root">
        <div className="topbar">
          <div className="logo">
            <div className="logo-mark">
              <i className="ti ti-shield-bolt" />
            </div>

            <div>
              <div className="logo-name">AegisOS</div>
              <div className="logo-sub">CONTROL CENTER</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`status-pill ${error ? "error" : ""}`}>
              <div className={`status-dot ${error ? "error" : ""}`} />

              <span className={`status-text ${error ? "error" : ""}`}>
                {error
                  ? "BACKEND OFFLINE"
                  : status
                  ? "ALL SYSTEMS NOMINAL"
                  : "CONNECTING..."}
              </span>
            </div>

            <span className="clock">{clock}</span>
          </div>
        </div>

        <div className="section-label">Live Metrics</div>

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
            <div className="panel-header">
              <span className="panel-title">
                <i className="ti ti-activity" />
                System Logs
              </span>

              <span className="panel-action">live feed</span>
            </div>

            <ul className="log-list">
              {logs.length === 0 ? (
                <li className="log-item info">
                  <span className="log-tag">INFO</span>
                  <span className="log-msg">
                    Waiting for backend...
                  </span>
                </li>
              ) : (
                logs.map((log, i) => (
                  <LogItem key={i} log={log} />
                ))
              )}
            </ul>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <i className="ti ti-chart-donut" />
                Resource Overview
              </span>

              <span className="panel-action">live</span>
            </div>

            <div className="donut-wrap">
              <DonutChart
                cpu={metrics.cpu}
                ram={metrics.ram}
                net={metrics.network}
              />

              <div className="donut-legend">
                <div className="legend-item">
                  <span className="legend-name">
                    <span
                      className="legend-dot"
                      style={{ background: "#4f6ef7" }}
                    />
                    CPU
                  </span>

                  <span className="legend-val">
                    {metrics.cpu ?? "--"}%
                  </span>
                </div>

                <div className="legend-item">
                  <span className="legend-name">
                    <span
                      className="legend-dot"
                      style={{ background: "#a78bfa" }}
                    />
                    RAM
                  </span>

                  <span className="legend-val">
                    {metrics.ram ?? "--"}%
                  </span>
                </div>

                <div className="legend-item">
                  <span className="legend-name">
                    <span
                      className="legend-dot"
                      style={{ background: "#34d399" }}
                    />
                    Network
                  </span>

                  <span className="legend-val">
                    {metrics.network ?? "--"}%
                  </span>
                </div>

                <div className="legend-item">
                  <span className="legend-name">
                    Avg Load
                  </span>

                  <span className="legend-val">
                    {avg ?? "--"}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{ marginTop: "12px" }}
        >
          <div className="panel-header">
            <span className="panel-title">
              <i className="ti ti-terminal-2" />
              Terminal
            </span>

            <span className="panel-action">
              interactive
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <input
              type="text"
              value={command}
              onChange={(e) =>
                setCommand(e.target.value)
              }
              placeholder="Enter command..."
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
              <div className="log-item info">
                <span className="log-tag">SYS</span>

                <span className="log-msg">
                  Terminal ready. Try: scan network
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