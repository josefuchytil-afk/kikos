"use client";

import { useState } from "react";

export default function Home() {
  const [tasks, setTasks] = useState([
    "Ranní bodíky",
    "Snídaně",
    "Prášky",
    "Dopolední bodíky",
    "Oběd",
    "Odpolední bodíky",
    "Večeře",
    "Zoubky",
  ]);

  const [checked, setChecked] = useState({});
  const [newTask, setNewTask] = useState("");

  const completed = tasks.filter((t) => checked[t]).length;

  function toggle(task) {
    setChecked((prev) => ({ ...prev, [task]: !prev[task] }));
  }

  function addTask() {
    const value = newTask.trim();
    if (!value) return;
    if (tasks.includes(value)) return;
    setTasks([...tasks, value]);
    setNewTask("");
  }

  function removeTask(task) {
    setTasks(tasks.filter((t) => t !== task));
    const copy = { ...checked };
    delete copy[task];
    setChecked(copy);
  }

  function reset() {
    setChecked({});
  }

  function mood() {
    if (completed === tasks.length && tasks.length > 0) return "🎉";
    if (completed > tasks.length * 0.7) return "🚀";
    if (completed > tasks.length * 0.4) return "😊";
    return "🐻";
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1>Kryštofův checklist {mood()}</h1>

      <p>
        Splněno: {completed} / {tasks.length}
      </p>

      <button onClick={reset}>Reset dne</button>

      <div style={{ marginTop: 20 }}>
        {tasks.map((task) => (
          <div key={task} style={{ marginBottom: 10 }}>
            <label>
              <input
                type="checkbox"
                checked={!!checked[task]}
                onChange={() => toggle(task)}
              />{" "}
              {task}
            </label>
            <button
              onClick={() => removeTask(task)}
              style={{ marginLeft: 10 }}
            >
              ❌
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Nový úkol"
        />
        <button onClick={addTask} style={{ marginLeft: 8 }}>
          Přidat
        </button>
      </div>
    </main>
  );
}
