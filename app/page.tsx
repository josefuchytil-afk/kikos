import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, RotateCcw, Trash2, Cloud, CloudOff, Save } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

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

const STORAGE_KEY = "krystof-checklist-local-fallback-v1";

// Sem doplň své údaje ze Supabase projektu
const SUPABASE_URL = "https://DOPLN-SVUJ-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "DOPLN_SVUJ_ANON_KEY";
const APP_ID = "kikos-checklist";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("DOPLN") &&
  !!SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("DOPLN");

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function todayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(key) {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function emptyDayState(tasks) {
  return Object.fromEntries(tasks.map((task) => [task, false]));
}

export default function KrystofChecklistPage() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [days, setDays] = useState({});
  const [newTask, setNewTask] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "cloud" : "local");
  const [message, setMessage] = useState("");
  const initialLoadDone = useRef(false);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);

      if (!supabase) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.tasks?.length) setTasks(parsed.tasks);
            if (parsed.days) setDays(parsed.days);
          }
          setMessage("Běží lokální režim v tomto zařízení.");
        } catch (e) {
          console.error("Nepodařilo se načíst lokální data", e);
        } finally {
          setIsLoading(false);
          initialLoadDone.current = true;
        }
        return;
      }

      try {
        const { data: settings, error: settingsError } = await supabase
          .from("checklist_settings")
          .select("tasks")
          .eq("app_id", APP_ID)
          .maybeSingle();

        if (settingsError) throw settingsError;

        const loadedTasks = Array.isArray(settings?.tasks) && settings.tasks.length ? settings.tasks : DEFAULT_TASKS;
        setTasks(loadedTasks);

        const { data: dayRows, error: dayError } = await supabase
          .from("checklist_days")
          .select("day_key, checks")
          .eq("app_id", APP_ID)
          .order("day_key", { ascending: false })
          .limit(30);

        if (dayError) throw dayError;

        const nextDays = {};
        for (const row of dayRows || []) {
          const checks = row.checks || {};
          nextDays[row.day_key] = Object.fromEntries(
            loadedTasks.map((task) => [task, Boolean(checks[task])])
          );
        }

        if (!nextDays[selectedDay]) {
          nextDays[selectedDay] = emptyDayState(loadedTasks);
        }

        setDays(nextDays);
        setSyncStatus("cloud");
        setMessage("Checklist se synchronizuje přes internet.");
      } catch (e) {
        console.error("Nepodařilo se načíst data ze Supabase", e);
        setSyncStatus("local");
        setMessage("Nepodařilo se připojit cloud. Aplikace běží dočasně lokálně.");
      } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (!supabase || syncStatus === "local") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks,
          days,
        })
      );
    }
  }, [tasks, days, syncStatus]);

  useEffect(() => {
    setDays((prev) => {
      if (prev[selectedDay]) return prev;
      return { ...prev, [selectedDay]: emptyDayState(tasks) };
    });
  }, [selectedDay, tasks]);

  useEffect(() => {
    setDays((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((day) => {
        const existing = next[day] || {};
        next[day] = Object.fromEntries(tasks.map((task) => [task, Boolean(existing[task])]));
      });
      return next;
    });
  }, [tasks]);

  useEffect(() => {
    if (!supabase || !initialLoadDone.current || syncStatus !== "cloud") return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);

        await supabase.from("checklist_settings").upsert(
          {
            app_id: APP_ID,
            tasks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "app_id" }
        );

        const dayChecks = days[selectedDay] || emptyDayState(tasks);

        await supabase.from("checklist_days").upsert(
          {
            app_id: APP_ID,
            day_key: selectedDay,
            checks: dayChecks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "app_id,day_key" }
        );
      } catch (e) {
        console.error("Nepodařilo se uložit do Supabase", e);
        setMessage("Uložení do cloudu se nepovedlo.");
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [tasks, days, selectedDay, syncStatus]);

  useEffect(() => {
    async function loadSelectedDay() {
      if (!supabase || syncStatus !== "cloud") return;
      if (days[selectedDay]) return;

      try {
        const { data, error } = await supabase
          .from("checklist_days")
          .select("checks")
          .eq("app_id", APP_ID)
          .eq("day_key", selectedDay)
          .maybeSingle();

        if (error) throw error;

        setDays((prev) => ({
          ...prev,
          [selectedDay]: data?.checks
            ? Object.fromEntries(tasks.map((task) => [task, Boolean(data.checks[task])]))
            : emptyDayState(tasks),
        }));
      } catch (e) {
        console.error("Nepodařilo se načíst den", e);
      }
    }

    loadSelectedDay();
  }, [selectedDay, syncStatus, tasks, days]);

  const selectedData = days[selectedDay] || {};

  const completedCount = useMemo(
    () => tasks.filter((task) => selectedData[task]).length,
    [tasks, selectedData]
  );

  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const recentDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      arr.push(`${year}-${month}-${day}`);
    }
    return arr;
  }, []);

  function toggleTask(task) {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: {
        ...(prev[selectedDay] || {}),
        [task]: !(prev[selectedDay] || {})[task],
      },
    }));
  }

  function addTask() {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    if (tasks.includes(trimmed)) {
      setNewTask("");
      return;
    }
    setTasks((prev) => [...prev, trimmed]);
    setNewTask("");
  }

  function deleteTask(taskToDelete) {
    setTasks((prev) => prev.filter((t) => t !== taskToDelete));
    setDays((prev) => {
      const next = {};
      for (const [day, taskMap] of Object.entries(prev)) {
        const copy = { ...taskMap };
        delete copy[taskToDelete];
        next[day] = copy;
      }
      return next;
    });
  }

  function resetDay() {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: emptyDayState(tasks),
    }));
  }

  function getMood(completed) {
    const steps = [
      { emoji: "🐻", text: "Začínáme!" },
      { emoji: "😊", text: "Super první krok!" },
      { emoji: "🙂", text: "Jen tak dál!" },
      { emoji: "😃", text: "Už ti to jde!" },
      { emoji: "😁", text: "Paráda!" },
      { emoji: "🤩", text: "Skvělý výkon!" },
      { emoji: "🚀", text: "Letíš jako raketa!" },
      { emoji: "🏆", text: "Skoro hotovo!" },
      { emoji: "🎉", text: "VYHRÁL JSI!" },
    ];

    const index = Math.min(completed, steps.length - 1);
    return steps[index];
  }

  const mood = getMood(completedCount);

  function renderLabel(task) {
    if (task.toLowerCase().includes("bodíky")) return "⚫⚫ " + task;
    if (task.toLowerCase().includes("prášky")) return "💊 " + task;
    if (task.toLowerCase().includes("snídaně")) return "🍽️ " + task;
    if (task.toLowerCase().includes("oběd")) return "🍛 " + task;
    if (task.toLowerCase().includes("večeře")) return "🍲 " + task;
    if (task.toLowerCase().includes("zoubky")) return "🦷🪥 " + task;
    return task;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-3xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-3xl md:text-4xl">Kryštofův denní checklist</CardTitle>
                  <p className="text-base text-slate-600 mt-2">Dneska sbíráme splněné úkoly a radostné smajlíky.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="rounded-2xl bg-white w-[190px]"
                  />
                  <Button variant="outline" className="rounded-2xl" onClick={resetDay}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset dne
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-3">
                <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${syncStatus === "cloud" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {syncStatus === "cloud" ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                  {syncStatus === "cloud" ? "Synchronizováno přes internet" : "Pouze lokálně v tomto zařízení"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  {isSaving ? <Save className="h-4 w-4" /> : null}
                  {isSaving ? "Ukládám..." : "Uloženo"}
                </div>
              </div>

              {message ? (
                <Alert className="mb-4 rounded-2xl">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Vybraný den</div>
                    <div className="text-lg font-semibold capitalize">{formatDate(selectedDay)}</div>
                  </div>
                  <div className="text-sm md:text-right">
                    <div className="font-semibold">Splněno: {completedCount} / {tasks.length}</div>
                    <div className="text-slate-500">Postup: {progress} %</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={progress} className="h-3 rounded-full" />
                </div>
                <div className="mt-5 rounded-3xl bg-sky-50 p-4 text-center">
                  <div className="text-6xl md:text-7xl leading-none">{mood.emoji}</div>
                  <div className="mt-3 text-lg md:text-xl font-semibold text-slate-800">{mood.text}</div>
                </div>
              </div>

              {isLoading ? (
                <div className="rounded-3xl bg-white p-8 text-center text-slate-500">Načítám checklist…</div>
              ) : (
                <div className="grid gap-3">
                  {tasks.map((task, index) => {
                    const checked = Boolean(selectedData[task]);
                    return (
                      <motion.div
                        key={task}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`flex items-center justify-between rounded-3xl border p-5 bg-white min-h-[84px] ${checked ? "ring-2 ring-emerald-200 bg-emerald-50" : ""}`}
                      >
                        <label className="flex items-center gap-4 cursor-pointer flex-1">
                          <Checkbox checked={checked} onCheckedChange={() => toggleTask(task)} className="h-7 w-7 rounded-md" />
                          <span className={`text-xl md:text-2xl font-semibold ${checked ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {renderLabel(task)}
                          </span>
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl"
                          onClick={() => deleteTask(task)}
                          aria-label={`Smazat úkol ${renderLabel(task)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid gap-6">
            <Card className="rounded-3xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl">Přidat položku</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="Např. Pití, cvičení, procedura"
                    className="rounded-2xl"
                  />
                  <Button onClick={addTask} className="rounded-2xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Přidat
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl">Posledních 7 dní</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {recentDays.map((day) => {
                    const done = tasks.filter((task) => days[day]?.[task]).length;
                    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`rounded-2xl border bg-white p-3 text-left transition hover:shadow-sm ${selectedDay === day ? "ring-2 ring-slate-300" : ""}`}
                      >
                        <div className="text-sm font-medium capitalize">{formatDate(day)}</div>
                        <div className="mt-1 text-sm text-slate-500">{done} / {tasks.length} splněno</div>
                        <div className="mt-2"><Progress value={pct} className="h-2" /></div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl">Jak to zapojit na internet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>1. V Supabase vytvoř tabulky checklist_settings a checklist_days.</p>
                <p>2. Do kódu doplň SUPABASE_URL a SUPABASE_ANON_KEY.</p>
                <p>3. Web pak může běžet třeba na noty.duobigband.cz/kikos.</p>
                <p>4. Po zapnutí cloudu uvidíš stejná data odkudkoli.</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
