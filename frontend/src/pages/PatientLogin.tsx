import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function PatientLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSignIn() {
    setErr("");
    try {
      const res = await api.patientLogin(email, password);
      localStorage.setItem("patient_token", res.access_token);
      localStorage.setItem("patient_email", email.trim().toLowerCase());
      nav("/patient/simulations");
    } catch (e: any) {
      setErr(String(e));
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Digital Twin</h1>
        <h2>Patient Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={onSignIn}>Sign In</button>
        <button onClick={() => nav("/login")} style={{ marginTop: "0.5rem" }}>
          Clinician Login
        </button>
        {err && <p style={{ color: "red" }}>{err}</p>}
      </div>
    </div>
  );
}
