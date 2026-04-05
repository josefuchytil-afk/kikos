"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_TASKS = [
  "Ranní bodíky",
  "Snídaně",
  "Prášky",
  "Dopolední bodíky",
  "Oběd",
  "Odpolední bodíky",
  "Večeře",
  "Zoubky",
];

const STORAGE_KEY = "krystof-checklist-v1";

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

function emptyChecks(tasks) {
  return Object.fromEntries(tasks.map((task) => [task, false]));
}

function moodFor(completed, total) {
  if (completed === total && total > 0) {
    return { emoji: "🤩", text: "Paráda! Všechno splněno!" };
  }
  if (completed >= 7) {
    return { emoji: "🎉", text: "Skvělé! Už jsi skoro hotový." };
  }
  if (completed >= 6) {
    return { emoji: "🏆", text: "Výborně! Ještě malý kousek." };
  }
  if (completed >= 5) {
    return { emoji: "🚀", text: "Letíš jako raketa!" };
  }
  if (completed >= 4) {
    return { emoji: "😁", text: "Paráda! Jde ti to moc hezky." };
  }
  if (completed >= 3) {
    return { emoji: "😃", text: "Už ti to jde! Jen tak dál." };
  }
  if (completed >= 2) {
    return { emoji: "🙂", text: "Dobře! Pokračujeme dál." };
  }
  if (completed >= 1) {
    return { emoji: "😊", text: "Super první krok!" };
  }
  return { emoji: "🐻", text: "Začínáme! Pojďme na první úkol." };
}

function taskLabel(task) {
  const lower = task.toLowerCase();
  if (lower.includes("bodíky")) return `⚫⚫ ${task}`;
  if (lower.includes("snídaně")) return `🍽️ ${task}`;
  if (lower.includes("prášky")) return `💊 ${task}`;
  if (lower.includes("oběd")) return `🍛 ${task}`;
  if (lower.includes("večeře")) return `🍲 ${task}`;
  if (lower.includes("zoubky")) return `🦷🪥 ${task}`;
  return task;
}

export default function Home() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [selectedDay, setSelectedDay] = useState(getTodayKey());
  const [days, setDays] = useState({});
  const [newTask, setNewTask] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const loadedTasks = Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : DEFAULT_TASKS;
        const loadedDays = parsed.days && typeof parsed.days === "object" ? parsed.days : {};
        setTasks(loadedTasks);
        setDays(loadedDays);
      }
    } catch (e) {
      console.error("Nepodařilo se načíst checklist", e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks,
        days,
      })
    );
  }, [tasks, days, ready]);

  useEffect(() => {
    setDays((prev) => {
      const existing = prev[selectedDay];
      if (existing) {
        const normalized = Object.fromEntries(tasks.map((task) => [task, Boolean(existing[task])]));
        const same = JSON.stringify(normalized) === JSON.stringify(existing);
        if (same) return prev;
        return { ...prev, [selectedDay]: normalized };
      }
      return { ...prev, [selectedDay]: emptyChecks(tasks) };
    });
  }, [selectedDay, tasks]);

  useEffect(() => {
    setDays((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((dayKey) => {
        const current = next[dayKey] || {};
        next[dayKey] = Object.fromEntries(tasks.map((task) => [task, Boolean(current[task])]));
      });
      return next;
    });
  }, [tasks]);

  const checks = days[selectedDay] || emptyChecks(tasks);
  const completed = useMemo(() => tasks.filter((task) => checks[task]).length, [tasks, checks]);
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const mood = moodFor(completed, tasks.length);

  function toggleTask(task) {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: {
        ...(prev[selectedDay] || emptyChecks(tasks)),
        [task]: !(prev[selectedDay] || emptyChecks(tasks))[task],
      },
    }));
  }

  function resetDay() {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: emptyChecks(tasks),
    }));
  }

  function addTask() {
    const value = newTask.trim();
    if (!value) return;
    if (tasks.includes(value)) {
      setNewTask("");
      return;
    }
    setTasks((prev) => [...prev, value]);
    setNewTask("");
  }

  function removeTask(task) {
    setTasks((prev) => prev.filter((t) => t !== task));
    setDays((prev) => {
      const next = {};
      for (const [dayKey, taskMap] of Object.entries(prev)) {
        const copy = { ...taskMap };
        delete copy[task];
        next[dayKey] = copy;
      }
      return next;
    });
  }

  const cardStyle = {
    background: "white",
    borderRadius: 24,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        padding: 20,
        fontFamily: "Inter, Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 1fr)",
        }}
      >
        <section style={cardStyle}>
          <div style={{ padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>Kryštofův checklist</h1>
                <p style={{ margin: "10px 0 0", color: "#475569", fontSize: 18 }}>
                  Dneska sbíráme splněné úkoly a radostné smajlíky.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #cbd5e1",
                    padding: "12px 14px",
                    fontSize: 16,
                    background: "white",
                  }}
                />
                <button
                  onClick={resetDay}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #cbd5e1",
                    padding: "12px 16px",
                    fontSize: 16,
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Reset dne
                </button>
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 22, padding: 20, background: "#fcfdff" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>Vybraný den</div>
                  <div style={{ fontWeight: 700, fontSize: 24, textTransform: "capitalize" }}>
                    {formatDate(selectedDay)}
                  </div>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    Splněno: {completed} / {tasks.length}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>Postup: {progress} %</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  height: 14,
                  background: "#e2e8f0",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)",
                    borderRadius: 999,
                    transition: "width 0.25s ease",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  background: "linear-gradient(180deg, #eff6ff 0%, #e0f2fe 100%)",
                  borderRadius: 24,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 72, lineHeight: 1 }}>{mood.emoji}</div>
                <div style={{ marginTop: 8, fontWeight: 800, fontSize: 28 }}>{mood.text}</div>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
              {tasks.map((task) => {
                const isChecked = Boolean(checks[task]);
                return (
                  <div
                    key={task}
                    style={{
                      ...cardStyle,
                      padding: "18px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      background: isChecked ? "#ecfdf5" : "white",
                      border: isChecked ? "2px solid #bbf7d0" : "1px solid #e5e7eb",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                        flex: 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(task)}
                        style={{ width: 28, height: 28, cursor: "pointer" }}
                      />
                      <span
                        style={{
                          fontSize: 30,
                          fontWeight: 700,
                          color: isChecked ? "#94a3b8" : "#0f172a",
                          textDecoration: isChecked ? "line-through" : "none",
                        }}
                      >
                        {taskLabel(task)}
                      </span>
                    </label>

                    <button
                      onClick={() => removeTask(task)}
                      style={{
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        background: "white",
                        width: 50,
                        height: 50,
                        fontSize: 20,
                        cursor: "pointer",
                      }}
                      aria-label={`Smazat ${task}`}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <section style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Přidat položku</h2>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Např. Pití, cvičení"
                style={{
                  flex: 1,
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  padding: "12px 14px",
                  fontSize: 16,
                }}
              />
              <button
                onClick={addTask}
                style={{
                  borderRadius: 16,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  padding: "12px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Přidat
              </button>
            </div>
          </section>

          <section style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Posledních 7 dní</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {recentDays.map((dayKey) => {
                const dayChecks = days[dayKey] || {};
                const done = tasks.filter((task) => dayChecks[task]).length;
                const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(dayKey)}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      border: selectedDay === dayKey ? "2px solid #93c5fd" : "1px solid #e2e8f0",
                      background: "white",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{formatDate(dayKey)}</div>
                    <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                      {done} / {tasks.length} splněno
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        height: 8,
                        background: "#e2e8f0",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ ...cardStyle, padding: 22, background: "#f8fafc" }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Jak to funguje</h2>
            <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.6, fontSize: 16 }}>
              <div>✓ Každý den se ukládá zvlášť.</div>
              <div>✓ Data zůstávají uložená v tomto zařízení.</div>
              <div>✓ Položky můžeš přidat nebo smazat.</div>
              <div>✓ Nahoře je smajlík a motivační věta.</div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
