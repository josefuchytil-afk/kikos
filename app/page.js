export default function Home() {
  const [tasks, setTasks] = React.useState([
    "Ranní bodíky",
    "Snídaně",
    "Prášky",
    "Dopolední bodíky",
    "Oběd",
    "Odpolední bodíky",
    "Večeře",
    "Zoubky",
  ]);

  const [checked, setChecked] = React.useState({});
  const [newTask, setNewTask] = React.useState("");

  const completed = tasks.filter((t) => checked[t]).length;

  function toggle(task) {
    setChecked((prev) => ({ ...prev, [task]: !prev[task] }));
  }

  function addTask() {
    if (!newTask.trim()) return;
    if (tasks.includes(newTask)) return;
    setTasks([...tasks, newTask]);
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
    if (completed === tasks.length) return "🎉";
    if (completed > tasks.length * 0.7) return "🚀";
    if (completed > tasks.length * 0.4) return "😊";
    return "🐻";
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
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
        <button onClick={addTask}>Přidat</button>
      </div>
    </main>
  );
}
