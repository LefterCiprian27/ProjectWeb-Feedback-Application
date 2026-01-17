import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:3001";

function fmtTime(ms) {
  return new Date(Number(ms)).toLocaleString();
}
function emojiFor(type) {
  if (type === "happy") return "🙂";
  if (type === "sad") return "🙁";
  if (type === "surprised") return "😮";
  if (type === "confused") return "😕";
  return "❓";
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function App() {
  const socket = useMemo(() => io(API), []);
  const [view, setView] = useState("home");
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    apiGet("/api/external/quote").then(setQuote).catch(() => setQuote(null));
  }, []);

  return (
    <div className="container">
      <h1>Continuous Feedback</h1>

      {quote && (
        <div className="card">
          <div className="small">External service</div>
          <div>{quote.content}</div>
          <div className="small">— {quote.author}</div>
        </div>
      )}

      {view === "home" && (
        <div className="card">
          <div className="row">
            <button onClick={() => setView("prof")}>Professor</button>
            <button onClick={() => setView("stud")}>Student</button>
          </div>
        </div>
      )}

      {view === "prof" && <Professor socket={socket} onHome={() => setView("home")} />}
      {view === "stud" && <Student socket={socket} onHome={() => setView("home")} />}
    </div>
  );
}

function Professor({ socket, onHome }) {
  const [mode, setMode] = useState("create");
  const [activities, setActivities] = useState([]);
  const [dashboardCode, setDashboardCode] = useState("");

  async function loadActivities() {
    const acts = await apiGet("/api/activities");
    setActivities(acts);
  }

  useEffect(() => {
    if (mode === "list") loadActivities();
  }, [mode]);

  return (
    <>
      <div className="row">
        <button onClick={() => setMode("create")}>Create</button>
        <button onClick={() => setMode("list")}>All activities</button>
        <button onClick={onHome}>Home</button>
      </div>

      {mode === "create" && (
        <ProfessorCreate
          onOpen={(code) => {
            setDashboardCode(code);
            setMode("dash");
          }}
        />
      )}

      {mode === "list" && (
        <div className="card">
          <h2>All activities</h2>
          {activities.map((a) => (
            <div className="item" key={a.code}>
              <div>
                <b>{a.title}</b> — {a.description}
                <br />
                Code: <b>{a.code}</b> | Active: {a.active ? "YES" : "NO"} | Feedback: {a.feedbackCount}
                <br />
                {fmtTime(a.startsAt)} → {fmtTime(a.endsAt)}
              </div>
              <button
                onClick={() => {
                  setDashboardCode(a.code);
                  setMode("dash");
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === "dash" && (
        <ProfessorDashboard
          socket={socket}
          code={dashboardCode}
          onBack={() => setMode("list")}
        />
      )}
    </>
  );
}

function ProfessorCreate({ onOpen }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");

  async function create() {
    setMsg("");
    const startsAt = start ? new Date(start).getTime() : NaN;
    const endsAt = end ? new Date(end).getTime() : NaN;
    const act = await apiPost("/api/activities", {
      title: title.trim(),
      description: description.trim(),
      startsAt,
      endsAt
    });
    setMsg(`Created. Code: ${act.code}`);
    onOpen(act.code);
  }

  return (
    <div className="card">
      <h2>Create activity</h2>

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>Description</label>
      <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />

      <label>Start</label>
      <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />

      <label>End</label>
      <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />

      <div className="row">
        <button onClick={() => create().catch((e) => setMsg(e.message))}>Create</button>
      </div>

      {msg && <div>{msg}</div>}
    </div>
  );
}

function ProfessorDashboard({ socket, code, onBack }) {
  const c = String(code || "").toUpperCase();
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    socket.emit("joinActivity", { code: c, role: "professor" });
  }, [c, socket]);

  async function loadHistory() {
    setErr("");
    const act = await apiGet(`/api/activities/${c}`);
    setInfo(`${act.title} | Active: ${act.active ? "YES" : "NO"}`);
    const hist = await apiGet(`/api/feedback/${c}`);
    setItems(hist.slice().reverse());
  }

  useEffect(() => {
    loadHistory().catch((e) => setErr(e.message));
  }, [c]);

  useEffect(() => {
    function onNewReaction(r) {
      if (r.code !== c) return;
      setItems((prev) => [{ type: r.type, ts: r.ts }, ...prev]);
    }
    function onErr(e) {
      setErr(e.error || "Socket error");
    }
    socket.on("newReaction", onNewReaction);
    socket.on("errorMessage", onErr);
    return () => {
      socket.off("newReaction", onNewReaction);
      socket.off("errorMessage", onErr);
    };
  }, [c, socket]);

  return (
    <div className="card">
      <div className="row">
        <button onClick={onBack}>Back</button>
        <button onClick={() => loadHistory().catch((e) => setErr(e.message))}>Reload</button>
      </div>

      <h2>Dashboard: {c}</h2>
      <div>{info}</div>
      {err && <div className="err">{err}</div>}

      <div>
        {items.map((it, idx) => (
          <div className="feedItem" key={idx}>
            <span>
              {emojiFor(it.type)} {it.type}
            </span>
            <span>{fmtTime(it.ts)}</span>
          </div>
        ))}
        {items.length === 0 && <div className="small">No feedback yet.</div>}
      </div>
    </div>
  );
}

function Student({ socket, onHome }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("");

  async function join() {
    setMsg("");
    setStatus("");
    const c = code.trim().toUpperCase();
    const act = await apiGet(`/api/activities/${c}`);
    if (!act.active) throw new Error("Activity is not active. Students can join only during the time window.");
    socket.emit("joinActivity", { code: c, role: "student" });
    setJoined(true);
  }

  useEffect(() => {
    function onErr(e) {
      setStatus(e.error || "Error");
    }
    socket.on("errorMessage", onErr);
    return () => socket.off("errorMessage", onErr);
  }, [socket]);

  function send(type) {
    const c = code.trim().toUpperCase();
    socket.emit("sendReaction", { code: c, type });
    setStatus(`Sent ${emojiFor(type)} at ${fmtTime(Date.now())}`);
  }

  return (
    <>
      <div className="row">
        <button onClick={onHome}>Home</button>
      </div>

      {!joined && (
        <div className="card">
          <h2>Student</h2>
          <label>Activity code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="row">
            <button onClick={() => join().catch((e) => setMsg(e.message))}>Join</button>
          </div>
          {msg && <div className="err">{msg}</div>}
        </div>
      )}

      {joined && (
        <div className="card">
          <h2>{code.trim().toUpperCase()}</h2>
          <div className="grid4">
            <button onClick={() => send("happy")}>🙂</button>
            <button onClick={() => send("sad")}>🙁</button>
            <button onClick={() => send("surprised")}>😮</button>
            <button onClick={() => send("confused")}>😕</button>
          </div>
          {status && <div>{status}</div>}
        </div>
      )}
    </>
  );
}
