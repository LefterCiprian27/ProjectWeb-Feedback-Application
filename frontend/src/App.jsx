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
  return "—";
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { ...authHeaders() }
  });

  const { json, text } = await readJsonSafe(res);

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || "Request failed";
    throw new Error(msg);
  }

  if (!json) throw new Error(text || "Backend did not return JSON");
  return json;
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });

  const { json, text } = await readJsonSafe(res);

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || "Request failed";
    throw new Error(msg);
  }

  if (!json) throw new Error(text || "Backend did not return JSON");
  return json;
}

function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("email", user.email || "");
  localStorage.setItem("role", user.role || "");
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");
  const [authRole, setAuthRole] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [quote, setQuote] = useState(null);
  const [bootErr, setBootErr] = useState("");

  const token = localStorage.getItem("token") || "";

  const socket = useMemo(() => {
    const s = io(API, { auth: { token } });
    return s;
  }, [token]);

  useEffect(() => {
    apiGet("/api/external/quote").then(setQuote).catch(() => setQuote(null));
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setUser(null);
      return;
    }

    apiGet("/api/auth/me")
      .then((me) => {
        const u = me.user || me;
        if (!u || !u.role) throw new Error("Invalid session");
        setUser({ email: u.email, role: u.role });
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (user) setView(user.role === "professor" ? "prof" : "stud");
    if (!user) setView("home");
  }, [user]);

  function logout() {
    clearAuth();
    setUser(null);
    setAuthRole(null);
    setAuthMode("login");
    setView("home");
  }

  function onAuthSuccess(payload) {
    const token = payload.token;
    const u = payload.user || payload;
    if (!token || !u) throw new Error("Invalid auth response");
    saveAuth(token, u);
    setUser({ email: u.email, role: u.role });
    setBootErr("");
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>Continuous Feedback</h1>
        {user && (
          <div className="row">
            <div className="small">
              {user.email} ({user.role})
            </div>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </div>

      {quote && (
        <div className="card">
          <div className="small">External service</div>
          <div>{quote.content}</div>
          <div className="small">— {quote.author}</div>
        </div>
      )}

      {bootErr && <div className="err">{bootErr}</div>}

      {!user && view === "home" && (
        <div className="card">
          <h2>Choose role</h2>
          <div className="row">
            <button
              onClick={() => {
                setAuthRole("professor");
                setAuthMode("login");
                setView("auth");
              }}
            >
              Professor
            </button>
            <button
              onClick={() => {
                setAuthRole("student");
                setAuthMode("login");
                setView("auth");
              }}
            >
              Student
            </button>
          </div>
        </div>
      )}

      {!user && view === "auth" && (
        <Auth
          role={authRole}
          mode={authMode}
          onMode={(m) => setAuthMode(m)}
          onBack={() => {
            setView("home");
            setAuthRole(null);
            setAuthMode("login");
          }}
          onSuccess={(payload) => {
            try {
              onAuthSuccess(payload);
            } catch (e) {
              setBootErr(e.message || "Auth error");
            }
          }}
        />
      )}

      {user && view === "prof" && <Professor socket={socket} onHome={() => setView("prof")} />}
      {user && view === "stud" && <Student socket={socket} onHome={() => setView("stud")} />}
    </div>
  );
}

function Auth({ role, mode, onMode, onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!role) throw new Error("Missing role");

    if (mode === "login") {
      const res = await apiPost("/api/auth/login", { email: email.trim(), password });
      onSuccess(res);
      return;
    }

    const res = await apiPost("/api/auth/register", { email: email.trim(), password, role });
    onSuccess(res);
  }

  return (
    <div className="card">
      <h2>{role === "professor" ? "Professor" : "Student"} {mode === "login" ? "login" : "register"}</h2>

      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />

      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <div className="row">
        <button onClick={() => submit().catch((e) => setErr(e.message))}>
          {mode === "login" ? "Login" : "Register"}
        </button>
        <button onClick={() => onMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Register" : "Back to login"}
        </button>
        <button onClick={onBack}>Back</button>
      </div>

      {err && <div className="err">{err}</div>}
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
    if (mode === "list") loadActivities().catch(() => {});
  }, [mode]);

  return (
    <>
      <div className="row">
        <button onClick={() => setMode("create")}>Create</button>
        <button onClick={() => setMode("list")}>All activities</button>
        
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
                Code: <b>{a.code}</b> | Active: {a.active ? "YES" : "NO"}
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
          {activities.length === 0 && <div className="small">No activities yet.</div>}
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

      {msg && <div className="err">{msg}</div>}
    </div>
  );
}

function ProfessorDashboard({ socket, code, onBack }) {
  const c = String(code || "").toUpperCase();
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    socket.emit("joinActivity", { code: c });
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

  const [myActs, setMyActs] = useState([]);
  const [mySummary, setMySummary] = useState({});
  const [myErr, setMyErr] = useState("");

  const [showMyActivities, setShowMyActivities] = useState(false);

  async function loadMyActivities() {
    setMyErr("");
    setShowMyActivities(true);

    const acts = await apiGet("/api/activities");
    setMyActs(acts);

    const sum = await apiGet("/api/feedback/mine/summary");
    const m = {};
    for (const s of sum) m[s.code] = s;
    setMySummary(m);
  }

  async function join() {
    setMsg("");
    setStatus("");
    const c = code.trim().toUpperCase();
    const act = await apiGet(`/api/activities/${c}`);
    if (!act.active) throw new Error("Activity is not active. Students can join only during the time window.");
    socket.emit("joinActivity", { code: c });
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
    if (mySummary[c]) {
      setStatus("You already reacted to this activity.");
      return;
    }
    socket.emit("sendReaction", { code: c, type });
    setStatus("Reaction sent.");
    setMySummary((prev) => ({ ...prev, [c]: { code: c, type, ts: Date.now() } }));
  }

  const currentCode = code.trim().toUpperCase();
  const alreadyReacted = !!mySummary[currentCode];

  return (
    <>
      <div className="row">
        <button
          onClick={() => {
            setShowMyActivities(false);
            setJoined(false);
            setStatus("");
            setMsg("");
            onHome();
          }}
        >
          Home
        </button>

        <button onClick={() => loadMyActivities().catch((e) => setMyErr(e.message))}>
          My activities
        </button>
      </div>

      {myErr && <div className="err">{myErr}</div>}

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

      {showMyActivities && (
        <div className="card">
          <h2>My rated activities</h2>
          {myActs.length === 0 ? (
            <div className="small">No rated activities yet. Join an activity and react once.</div>
          ) : (
            myActs.map((a) => {
              const s = mySummary[a.code];
              const emoji = s ? emojiFor(s.type) : "—";
              return (
                <div className="item" key={a.code}>
                  <div>
                    <b>{a.title}</b> — {a.description}
                    <br />
                    Code: <b>{a.code}</b> | Active: {a.active ? "YES" : "NO"}
                    <br />
                    Your reaction: <span style={{ fontSize: "22px" }}>{emoji}</span>
                  </div>
                 
                </div>
              );
            })
          )}
        </div>
      )}

      {joined && (
        <div className="card">
          <h2>{currentCode}</h2>

          {alreadyReacted ? (
            <div className="small">
              You already reacted: <b>{emojiFor(mySummary[currentCode].type)}</b>
            </div>
          ) : (
            <div className="grid4">
              <button onClick={() => send("happy")}>🙂</button>
              <button onClick={() => send("sad")}>🙁</button>
              <button onClick={() => send("surprised")}>😮</button>
              <button onClick={() => send("confused")}>😕</button>
            </div>
          )}

          {status && <div>{status}</div>}
        </div>
      )}
    </>
  );
}
