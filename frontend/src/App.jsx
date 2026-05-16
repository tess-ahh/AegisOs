import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Booting AegisOS...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("Backend offline ❌"));
  }, []);

  return (
    <div style={{
      height: "100vh",
      background: "#050505",
      color: "#00ffe1",
      fontFamily: "monospace",
      padding: "30px"
    }}>
      <h1>🧠 AegisOS CONTROL CENTER</h1>

      <div style={{
        marginTop: "20px",
        padding: "20px",
        border: "1px solid #00ffe1",
        borderRadius: "10px",
        width: "400px",
        boxShadow: "0 0 20px #00ffe1"
      }}>
        <p>SYSTEM STATUS</p>
        <h2>{status}</h2>
      </div>
    </div>
  );
}

export default App;