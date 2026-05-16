import { useEffect, useState } from "react";

function App() {

  const [status, setStatus] = useState("");
  const [metrics, setMetrics] = useState({});
  const [logs, setLogs] = useState([]);

  useEffect(() => {

    const fetchData = () => {

      fetch("http://127.0.0.1:8000/")
        .then(res => res.json())
        .then(data => setStatus(data.status));

      fetch("http://127.0.0.1:8000/metrics")
        .then(res => res.json())
        .then(data => setMetrics(data));

      fetch("http://127.0.0.1:8000/logs")
        .then(res => res.json())
        .then(data => setLogs(data.logs));
    };

    fetchData();

    const interval = setInterval(fetchData, 1000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div style={{
      background: "#050505",
      color: "#00ffe1",
      minHeight: "100vh",
      fontFamily: "monospace",
      padding: "20px"
    }}>

      <h1>🧠 AegisOS CONTROL CENTER</h1>

      <div style={{
        border: "1px solid #00ffe1",
        padding: "15px",
        borderRadius: "10px",
        marginBottom: "20px",
        boxShadow: "0 0 15px #00ffe1"
      }}>
        <h2>⚡ SYSTEM STATUS</h2>
        <p>{status}</p>
      </div>

      <div style={{
        display: "flex",
        gap: "20px",
        marginBottom: "20px"
      }}>

        <div style={{
          border: "1px solid #00ffe1",
          padding: "15px",
          borderRadius: "10px",
          width: "200px"
        }}>
          <h3>CPU</h3>
          <p>{metrics.cpu}%</p>
        </div>

        <div style={{
          border: "1px solid #00ffe1",
          padding: "15px",
          borderRadius: "10px",
          width: "200px"
        }}>
          <h3>RAM</h3>
          <p>{metrics.ram}%</p>
        </div>

        <div style={{
          border: "1px solid #00ffe1",
          padding: "15px",
          borderRadius: "10px",
          width: "200px"
        }}>
          <h3>NETWORK</h3>
          <p>{metrics.network}%</p>
        </div>

      </div>

      <div style={{
        border: "1px solid #00ffe1",
        padding: "15px",
        borderRadius: "10px",
        boxShadow: "0 0 15px #00ffe1"
      }}>

        <h2>🧾 LIVE SYSTEM LOGS</h2>

        <ul>
          {logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>

      </div>

    </div>
  );
}

export default App;