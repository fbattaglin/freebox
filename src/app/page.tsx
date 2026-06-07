"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Check, 
  Info, 
  Calendar, 
  Flame, 
  Sliders, 
  Award, 
  Moon, 
  Zap, 
  Dumbbell, 
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  User,
  Activity,
  Loader2,
  Settings,
  Brain,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  ArrowRight,
  Heart
} from "lucide-react";
import { getCycleState } from "@/lib/cycle-math";
import { LlmWorkoutOutput, UserProfile } from "@/lib/schemas";
import skillsLibraryJson from "@/../data/skills-library.json";
import { SessionSummary } from "@/components/session-summary";
import { HistoryCalendar } from "@/components/history-calendar";

// Types for LocalStorage persistence
interface LocalHistoryEntry {
  date: string;
  phase: string;
  dayName: string;
  why: string;
  exercises: {
    id: string;
    name: string;
    setsData: { weight: string; reps: string; done: boolean }[];
  }[];
}

interface SkillState {
  [familyId: string]: number; // Maps familyId to current level (1-6)
}

// Pre-determined recovery messages to avoid token consumption
const getRecoveryMessage = (phase: string, date: Date) => {
  const generic = [
    "tissue repair and neurological adaptation require a caloric surplus and high-quality sleep.",
    "i know you want to keep moving, but trust the process. let your metabolic buffers reset today.",
    "science tells us that adaptation happens between sessions, not during them. enjoy your passive recovery."
  ];
  
  const specific: Record<string, string[]> = {
    strength: [
      "your central nervous system took a hit this week with those heavy loads. sleep is your #1 priority tonight.",
      "we maximized neurological strength gains this week. keep your protein intake high so your motor units can rebuild."
    ],
    hypertrophy: [
      "myofibrillar protein synthesis is peaking right now. give your muscles the fuel they need to grow.",
      "you caused a lot of mechanical tension this week. stretch those sore muscles and eat well!"
    ],
    resistance: [
      "your metabolic buffers are exhausted from all that lactic acid. hydrate aggressively today.",
      "we pushed your endurance limits this week. active recovery like a light walk will help clear out any lingering fatigue."
    ],
    explosive: [
      "rate of force development training requires a fresh CNS. absolutely zero explosive movements today. rest completely.",
      "your tendons and joints worked hard this week. prioritize mobility and joint health today."
    ],
    deload: [
      "this is the week where the magic happens. your body is shedding accumulated fatigue to reveal your new strength baseline.",
      "active supercompensation is in full effect. keep the stress low and enjoy the easy week."
    ]
  };

  const pool = specific[phase] || generic;
  return pool[date.getDate() % pool.length];
};

export default function Home() {
  // --- State Variables ---
  const [mounted, setMounted] = useState(false);
  const [cycleStartDate, setCycleStartDate] = useState<string>("");
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [skills, setSkills] = useState<SkillState>({});
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: "",
    weight: "",
    experience: "intermediate",
    limitations: "",
    longTermMemory: ""
  });
  
  // Readiness check-in sliders (0-100)
  const [sleep, setSleep] = useState<number>(70);
  const [energy, setEnergy] = useState<number>(70);
  const [recovery, setRecovery] = useState<number>(70);
  
  // App UX Flow state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // Current active workout generated from server
  const [currentWorkout, setCurrentWorkout] = useState<any | null>(null);
  
  // Active tracker for the workout sets
  // Structure: { [exerciseId]: { [setIdx]: { weight: string, reps: string, done: boolean }[] } }
  const [workoutTracker, setWorkoutTracker] = useState<{
    [exerciseId: string]: { weight: string; reps: string; done: boolean }[];
  }>({});

  // Cycle debrief state
  const [isDebriefing, setIsDebriefing] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"workout" | "history">("workout");
  const [sessionSummaryData, setSessionSummaryData] = useState<{ workout: any; tracker: any } | null>(null);

  // Saturday skills active expanded accordion family ID
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  // Settings and Access Passcode states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [passcodeStatus, setPasscodeStatus] = useState<"unknown" | "checking" | "valid" | "invalid" | "open">("unknown");

  // Developer simulation overrides (for local testing on Mac)
  const [simulatedDateOffset, setSimulatedDateOffset] = useState<number>(0);
  const [activeDate, setActiveDate] = useState<Date>(new Date());

  // --- Initialize App ---
  useEffect(() => {
    setMounted(true);
    
    // Register PWA Service Worker (only in production)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("Unregistered stale service worker in development mode.");
              }
            });
          }
        });
      } else {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registered with scope:", reg.scope);
            
            // Check for updates to force reload when a new service worker takes over
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
                    console.log("New service worker activated. Reloading page...");
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((err) => console.error("Service Worker registration failed:", err));
      }
    }
    
    // Load from LocalStorage
    const savedStartDate = localStorage.getItem("freebox_cycle_start");
    if (savedStartDate) setCycleStartDate(savedStartDate);

    const savedHistory = localStorage.getItem("freebox_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedSkills = localStorage.getItem("freebox_skills");
    if (savedSkills) {
      setSkills(JSON.parse(savedSkills));
    } else {
      // Default to level 1 for all 7 calisthenics families
      const defaultSkills: SkillState = {};
      skillsLibraryJson.families.forEach((f) => {
        defaultSkills[f.id] = 1;
      });
      setSkills(defaultSkills);
      localStorage.setItem("freebox_skills", JSON.stringify(defaultSkills));
    }

    // Set first skills family active by default
    if (skillsLibraryJson.families.length > 0) {
      setActiveFamilyId(skillsLibraryJson.families[0].id);
    }

    const savedProfile = localStorage.getItem("freebox_user_profile");
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    const savedPasscode = localStorage.getItem("freebox_access_passcode");
    if (savedPasscode) {
      setPasscode(savedPasscode);
      // Auto-verify passcode on startup
      verifyPasscodeOnLoad(savedPasscode);
    }

    // Auto-initialize cycle: if profile exists but no cycle date, set to today
    const sp = localStorage.getItem("freebox_user_profile");
    const sd = localStorage.getItem("freebox_cycle_start");
    if (sp && !sd) {
      const profile = JSON.parse(sp);
      if (profile.age && profile.weight) {
        const now = new Date();
        const autoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        localStorage.setItem("freebox_cycle_start", autoDate);
        setCycleStartDate(autoDate);
      }
    }
  }, []);

  // Update date whenever simulatedDateOffset changes
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + simulatedDateOffset);
    setActiveDate(d);
    
    // Clear current unsaved workout if day shifts to prevent leakage
    setCurrentWorkout(null);
    setWorkoutTracker({});
    setError("");
  }, [simulatedDateOffset]);

  // --- Passcode Verification ---
  const verifyPasscodeOnLoad = async (code: string) => {
    try {
      setPasscodeStatus("checking");
      const res = await fetch("/api/verify", {
        headers: { "x-freebox-passcode": code },
      });
      const data = await res.json();
      if (data.valid) {
        setPasscodeStatus(data.mode === "open" ? "open" : "valid");
      } else {
        setPasscodeStatus("invalid");
      }
    } catch {
      setPasscodeStatus("unknown");
    }
  };

  const handleVerifyPasscode = async () => {
    await verifyPasscodeOnLoad(passcode);
  };

  if (!mounted) return null;

  // --- Calculate Cycle Variables ---
  // Use local date components to avoid UTC timezone shift
  // (critical: toISOString() would shift the date forward after 6pm in UTC-6)
  const todayStr = `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}-${String(activeDate.getDate()).padStart(2, '0')}`;
  const cycleState = cycleStartDate ? getCycleState(cycleStartDate, activeDate) : null;
  const isRestDay = cycleState?.dayType === "rest";
  const isSkillsDay = cycleState?.dayType === "skills";

  // Check if today's workout has already been logged in history
  const todaysLog = history.find((h) => h.date === todayStr);

  // --- Dynamic Slider Labels ---
  const getSleepLabel = (val: number) => {
    if (val < 45) return "disrupted";
    if (val <= 75) return "rested";
    return "exceptionally rested";
  };
  const getEnergyLabel = (val: number) => {
    if (val < 45) return "lethargic";
    if (val <= 75) return "focused";
    return "fully charged";
  };
  const getRecoveryLabel = (val: number) => {
    if (val < 45) return "sore / stiff";
    if (val <= 75) return "minor soreness";
    return "fully recovered";
  };

  // --- Onboarding Action ---
  const handleStartCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleStartDate) return;
    localStorage.setItem("freebox_cycle_start", cycleStartDate);
    localStorage.setItem("freebox_user_profile", JSON.stringify(userProfile));
    setCycleStartDate(cycleStartDate);
  };

  const handleResetCycle = () => {
    if (confirm("Are you sure you want to reset the current cycle? Your history and skills will be kept, but the start date will be cleared.")) {
      localStorage.removeItem("freebox_cycle_start");
      setCycleStartDate("");
      setCurrentWorkout(null);
      setWorkoutTracker({});
    }
  };

  // --- Cycle Debrief Action ---
  const handleDebriefCycle = async () => {
    if (history.length === 0) {
      alert("Not enough history to debrief.");
      return;
    }
    
    setIsDebriefing(true);
    setError("");

    try {
      const response = await fetch("/api/debrief", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-freebox-passcode": passcode
        },
        body: JSON.stringify({ history: history.slice(-55) }), // Pass up to the last 11 weeks of logs
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to debrief cycle.");
      }

      // Update the user profile with the new long term memory
      const updatedProfile = { ...userProfile, longTermMemory: data.memory };
      setUserProfile(updatedProfile);
      localStorage.setItem("freebox_user_profile", JSON.stringify(updatedProfile));
      
      alert("Cycle debrief complete! The intelligence engine has updated your athlete profile.");

    } catch (err: any) {
      setError(err.message || "Failed to debrief.");
    } finally {
      setIsDebriefing(false);
    }
  };

  // --- Generate Workout Action ---
  const handleGenerateWorkout = async () => {
    if (!cycleState) return;
    setLoading(true);
    setError("");

    // Gather weekly history context for the LLM
    // We pass the last 5 workouts to cover a full week of training
    const weeklyHistory = history.slice(-5);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-freebox-passcode": passcode
        },
        body: JSON.stringify({
          sleep,
          energy,
          recovery,
          cycleStartDate,
          activeDate: `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}-${String(activeDate.getDate()).padStart(2, '0')}T12:00:00.000Z`, // Send as noon UTC to avoid date shift
          weeklyHistory,
          userProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error generating workout.");
      }

      setCurrentWorkout(data);

      // Initialize tracker with default reps/sets
      const initialTracker: typeof workoutTracker = {};
      data.exercises.forEach((ex: any) => {
        let defaultRepVal = "8";
        if (ex.reps.includes("-")) {
          defaultRepVal = ex.reps.split("-")[1]; // Pick high end
        } else if (ex.reps.includes("+")) {
          defaultRepVal = ex.reps.replace("+", "");
        } else {
          defaultRepVal = ex.reps;
        }

        initialTracker[ex.exercise_id] = Array.from({ length: ex.sets }).map(() => ({
          weight: "",
          reps: defaultRepVal,
          done: false,
        }));
      });

      setWorkoutTracker(initialTracker);

    } catch (err: any) {
      setError(err.message || "Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  // --- Tracking Action ---
  const handleToggleSet = (exerciseId: string, setIdx: number) => {
    const updated = { ...workoutTracker };
    const sets = [...updated[exerciseId]];
    sets[setIdx] = {
      ...sets[setIdx],
      done: !sets[setIdx].done,
    };
    updated[exerciseId] = sets;
    setWorkoutTracker(updated);
  };

  const handleUpdateTracker = (exerciseId: string, setIdx: number, field: "weight" | "reps", value: string) => {
    const updated = { ...workoutTracker };
    const sets = [...updated[exerciseId]];
    sets[setIdx] = {
      ...sets[setIdx],
      [field]: value,
    };
    updated[exerciseId] = sets;
    setWorkoutTracker(updated);
  };

  // Check if all exercises and sets are marked as completed
  const isWorkoutFinished = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) return false;
    return currentWorkout.exercises.every((ex: any) => 
      workoutTracker[ex.exercise_id]?.every((set) => set.done)
    );
  };

  const handleFinishWorkout = () => {
    if (!currentWorkout) return;

    const newEntry: LocalHistoryEntry = {
      date: todayStr,
      phase: currentWorkout.phase,
      dayName: currentWorkout.dayName,
      why: currentWorkout.why,
      exercises: currentWorkout.exercises.map((ex: any) => ({
        id: ex.exercise_id,
        name: ex.name,
        setsData: workoutTracker[ex.exercise_id].map((set) => ({
          weight: set.weight || "0",
          reps: set.reps,
          done: set.done,
        })),
      })),
    };

    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem("freebox_history", JSON.stringify(updatedHistory));

    // Show Session Debrief instead of clearing immediately
    setSessionSummaryData({ workout: currentWorkout, tracker: workoutTracker });
  };

  const handleDeleteSession = (dateToDelete: string) => {
    const updatedHistory = history.filter((entry) => entry.date !== dateToDelete);
    setHistory(updatedHistory);
    localStorage.setItem("freebox_history", JSON.stringify(updatedHistory));
  };

  // --- Saturday Skills Action ---
  const handleUpdateSkillLevel = (familyId: string, newLevel: number) => {
    const updated = { ...skills, [familyId]: newLevel };
    setSkills(updated);
    localStorage.setItem("freebox_skills", JSON.stringify(updated));
  };

  const handleFinishSkillsDay = () => {
    const newEntry: LocalHistoryEntry = {
      date: todayStr,
      phase: cycleState!.phase,
      dayName: cycleState!.dayName,
      why: "Saturday skills. Bodyweight progressions logged.",
      exercises: Object.entries(skills).map(([familyId, level]) => {
        const family = skillsLibraryJson.families.find((f) => f.id === familyId);
        const skillItem = family?.levels.find((l) => l.level === level);
        return {
          id: familyId,
          name: skillItem?.name || "Skill",
          setsData: [{ weight: "body", reps: `Level ${level}`, done: true }],
        };
      }),
    };

    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem("freebox_history", JSON.stringify(updatedHistory));
    alert("Saturday skills recorded successfully.");
  };

  // Custom premium skeleton loader simulating Braun layout
  const SkeletonWorkout = () => (
    <div className="space-y-6 pt-2 animate-pulse">
      <div className="flex items-center gap-2 mb-4 text-brand-deep text-xs font-mono lowercase">
        <Loader2 className="w-4 h-4 animate-spin" /> synthesizing protocol...
      </div>
      <div className="h-16 bg-[#F9F9FB] rounded border border-border-light"></div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div>
              <div className="h-4 bg-[#F9F9FB] rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-[#F9F9FB] rounded w-2/3"></div>
            </div>
            <div className="h-10 bg-[#FDFDFD] border border-border-light rounded"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-9 bg-[#FDFDFD] border border-border-light rounded w-full"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Helper to calculate tomorrow's split
  const getTomorrowSplit = () => {
    if (!cycleStartDate) return null;
    const tomorrow = new Date(activeDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getCycleState(cycleStartDate, tomorrow);
  };
  const tomorrowState = getTomorrowSplit();

  // Helper for phase science breakdowns
  const getPhaseScienceDetail = (phase: string) => {
    switch (phase) {
      case "strength":
        return {
          title: "strength phase (weeks 1–3)",
          focus: "neural adaptations & recruitment",
          text: "targets motor unit recruitment and rate of force development. by lifting heavy weights (80-87% 1RM) at lower volumes, we maximize neurological strength gains without accumulating high muscular hypertrophy fatigue."
        };
      case "hypertrophy":
        return {
          title: "hypertrophy phase (weeks 4–6)",
          focus: "myofibrillar protein synthesis",
          text: "targets mechanical tension and metabolic stress. moderately high volume (3-4 sets of 6-12 reps) stimulates muscle cross-sectional area growth and myofibrillar protein synthesis."
        };
      case "resistance":
        return {
          title: "resistance phase (weeks 7–8)",
          focus: "metabolic stress tolerance",
          text: "drives capillary density and metabolic buffer efficiency. higher reps with shorter rest intervals increase muscular endurance and lactate clearance rates."
        };
      case "explosive":
        return {
          title: "explosive phase (weeks 9–10)",
          focus: "rate of force development (rfd)",
          text: "targets power output, velocity, and tendon stiffness. focusing on fast concentric movements sharpens the central nervous system's capacity to recruit high-threshold motor units rapidly."
        };
      case "deload":
        return {
          title: "deload phase (week 11)",
          focus: "active supercompensation",
          text: "promotes nervous system recovery and tissue repair. by dropping set volume by 30-50% while maintaining moderate intensity, the body sheds accumulated fatigue, revealing new strength baselines."
        };
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 w-full max-w-xl mx-auto flex flex-col px-4 py-8">
      {/* Header */}
      <header className="mb-4 flex justify-between items-center border-b border-border-light pb-4">
        <div className="flex items-center gap-3">
          <Image src="/freebox_logo.png" alt="Freebox Logo" width={64} height={64} className="opacity-90" />
          <div>
            <h1 className="text-xl font-medium tracking-tight text-foreground lowercase">freebox</h1>
            <p className="text-xs text-text-secondary lowercase">a free-box in your pocket.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsSettingsOpen(true)} 
          className="text-xs text-text-secondary hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-1 border border-border-light rounded bg-[#F9F9FB]"
        >
          <Settings className="w-4 h-4" />
          settings
        </button>
      </header>

      {/* === PERSISTENT STATUS BAR === */}
      {cycleStartDate && cycleState && (
        <div className="mb-4 p-3 bg-[#FDFDFD] border border-border-light rounded-md space-y-2">
          {/* Row 1: Date + Phase */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-brand-deep" />
              <span className="font-mono text-foreground font-medium">
                {activeDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-text-secondary">•</span>
              <span className="text-brand-deep font-medium lowercase">{cycleState.dayName}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Passcode status indicator */}
              {passcodeStatus === "valid" ? (
                <div className="flex items-center gap-1 text-[10px] text-green-600 font-mono" title="Passcode verified">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              ) : passcodeStatus === "open" ? (
                <div className="flex items-center gap-1 text-[10px] text-amber-500 font-mono" title="No passcode required (open mode)">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              ) : passcodeStatus === "invalid" ? (
                <div className="flex items-center gap-1 text-[10px] text-red-500 font-mono" title="Invalid passcode">
                  <ShieldX className="w-3.5 h-3.5" />
                </div>
              ) : passcodeStatus === "checking" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-text-secondary font-mono" title="Passcode not verified yet">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
          {/* Row 2: Phase + Week progress mini bar */}
          <div className="flex items-center gap-2 text-[10px] text-text-secondary font-mono">
            <span className="lowercase">{cycleState.phase}</span>
            <span>•</span>
            <span>week {cycleState.currentWeek}/11</span>
            <div className="flex-1 flex gap-0.5 ml-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-sm ${
                    i + 1 === cycleState.currentWeek
                      ? "bg-brand-deep"
                      : i + 1 < cycleState.currentWeek
                      ? "bg-brand-deep/30"
                      : "bg-border-light"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Developer Simulation Override Tool — HIDDEN IN PRODUCTION */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-3 bg-[#F9F9FB] border border-border-light rounded text-[11px] font-mono text-text-secondary">
          <div className="font-semibold mb-1 uppercase tracking-wider text-[10px]">simulation tool (mac debug)</div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              active date: <span className="font-semibold">{todayStr}</span> ({cycleState?.dayName || "rest"})
            </div>
            <div className="flex gap-1 ml-auto">
              <button 
                onClick={() => setSimulatedDateOffset(prev => prev - 1)}
                className="px-2 py-0.5 bg-[#F9F9FB] border border-border-light rounded active:bg-[#EAEAEA] cursor-pointer"
              >
                -1 day
              </button>
              <button 
                onClick={() => setSimulatedDateOffset(0)}
                className="px-2 py-0.5 bg-[#F9F9FB] border border-border-light rounded active:bg-[#EAEAEA] cursor-pointer"
              >
                today
              </button>
              <button 
                onClick={() => setSimulatedDateOffset(prev => prev + 1)}
                className="px-2 py-0.5 bg-[#F9F9FB] border border-border-light rounded active:bg-[#EAEAEA] cursor-pointer"
              >
                +1 day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR DISPLAY */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-800 rounded">
          {error}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col gap-6">
        
        {cycleStartDate && (
          <div className="flex border-b border-border-light text-sm text-text-secondary">
            <button 
              onClick={() => setViewMode("workout")}
              className={`pb-2 px-1 mr-4 border-b-2 transition-colors cursor-pointer ${viewMode === "workout" ? "border-brand-deep text-foreground font-medium" : "border-transparent hover:text-foreground"}`}
            >
              workout
            </button>
            <button 
              onClick={() => setViewMode("history")}
              className={`pb-2 px-1 border-b-2 transition-colors cursor-pointer ${viewMode === "history" ? "border-brand-deep text-foreground font-medium" : "border-transparent hover:text-foreground"}`}
            >
              history
            </button>
          </div>
        )}

        {viewMode === "history" ? (
          <HistoryCalendar history={history} onDelete={handleDeleteSession} />
        ) : sessionSummaryData ? (
          <SessionSummary 
            workout={sessionSummaryData.workout} 
            tracker={sessionSummaryData.tracker} 
            onClose={() => {
              setSessionSummaryData(null);
              setCurrentWorkout(null);
              setWorkoutTracker({});
            }} 
          />
        ) : (
        <>
        {/* 1. ONBOARDING (Start Cycle Date Picker) */}
        {!cycleStartDate ? (
          <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6">
            {/* Welcome Card */}
            <div className="mb-6 p-5 bg-brand-soft rounded-lg border border-brand-deep/10 shadow-sm">
              <h2 className="text-base font-semibold text-brand-deep lowercase mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                welcome to freebox, athlete
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed lowercase mb-3">
                i'm your AI sports scientist. i've designed freebox to build your training using real science—adapting every single session to how you slept, your energy levels, and your recovery. let's set up your baseline profile so we can kick off your first 11-week periodized cycle. i'm excited to work with you!
              </p>
              <div className="flex items-start gap-2 p-3 bg-white/60 rounded border border-brand-deep/5">
                <ShieldCheck className="w-4 h-4 text-brand-deep mt-0.5 shrink-0" />
                <p className="text-[11px] text-text-secondary lowercase font-mono">
                  privacy first: all your personal data stays right here on this device. i only send the necessary metrics to the lab (server) when synthesizing your next workout.
                </p>
              </div>
            </div>

            <h3 className="text-base font-medium mb-2 lowercase">let's initialize your cycle</h3>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed lowercase">
              we'll be using an evidence-based 11-week block periodization model. just tell me when you want to start, and i'll map out all your training phases.
            </p>
            
            <form onSubmit={handleStartCycle} className="space-y-4">
              {(!userProfile.age || !userProfile.weight) ? (
                <div className="space-y-3 pb-4 border-b border-border-light">
                  <h3 className="text-sm font-medium lowercase flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-deep" />
                    athlete profile
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 lowercase">age</label>
                      <input 
                        type="number" 
                        value={userProfile.age}
                        onChange={(e) => {
                          const updated = {...userProfile, age: e.target.value};
                          setUserProfile(updated);
                          localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                        }}
                        placeholder="e.g. 30"
                        className="w-full px-3 py-2 border border-border-light rounded bg-[#FDFDFD] text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 lowercase">weight (kg)</label>
                      <input 
                        type="number" 
                        value={userProfile.weight}
                        onChange={(e) => {
                          const updated = {...userProfile, weight: e.target.value};
                          setUserProfile(updated);
                          localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                        }}
                        placeholder="e.g. 80"
                        className="w-full px-3 py-2 border border-border-light rounded bg-[#FDFDFD] text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1 lowercase">experience level</label>
                    <select 
                      value={userProfile.experience}
                      onChange={(e) => {
                        const updated = {...userProfile, experience: e.target.value};
                        setUserProfile(updated);
                        localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                      }}
                      className="w-full px-3 py-2 border border-border-light rounded bg-[#FDFDFD] text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1 lowercase">injuries / limitations</label>
                    <input 
                      type="text" 
                      value={userProfile.limitations}
                      onChange={(e) => {
                        const updated = {...userProfile, limitations: e.target.value};
                        setUserProfile(updated);
                        localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                      }}
                      placeholder="e.g. low back pain, shoulder impingement (or leave blank)"
                      className="w-full px-3 py-2 border border-border-light rounded bg-[#FDFDFD] text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F9F9FB] rounded text-xs text-text-secondary leading-relaxed border border-border-light flex justify-between items-center mb-4">
                  <div>
                    <span className="font-semibold text-foreground lowercase">athlete profile is active</span>
                    <div className="text-[10px] mt-0.5 font-mono">
                      age: {userProfile.age} | weight: {userProfile.weight}kg | level: {userProfile.experience}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-[10px] text-brand-deep font-mono underline cursor-pointer hover:text-brand-deep/80"
                  >
                    edit profile
                  </button>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-text-secondary lowercase">cycle start date</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      const today = new Date();
                      const offsetDate = new Date(today.setDate(today.getDate() + simulatedDateOffset));
                      setCycleStartDate(offsetDate.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] text-brand-deep font-mono underline cursor-pointer"
                  >
                    set to today
                  </button>
                </div>
                <input 
                  type="date" 
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded bg-[#FDFDFD] text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                  required
                />
              </div>
              
              <div className="p-3 bg-brand-soft rounded text-xs text-brand-deep leading-relaxed">
                <div className="font-medium mb-1 lowercase">scientific cycle breakdown:</div>
                <ul className="space-y-1 list-disc pl-4 text-text-secondary">
                  <li>Weeks 1–3: Strength (neural adaptation)</li>
                  <li>Weeks 4–6: Hypertrophy (miofibrilar hypertrophy)</li>
                  <li>Weeks 7–8: Resistance (metabolic stress tolerance)</li>
                  <li>Weeks 9–10: Explosive (rate of force development)</li>
                  <li>Week 11: Deload (active supercompensation)</li>
                </ul>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-brand-deep text-white hover:bg-opacity-90 font-medium rounded-lg text-sm transition-opacity cursor-pointer lowercase shadow-sm"
              >
                start my 11-week cycle
              </button>
            </form>
          </div>
        ) : (
          /* ACTIVE USER STATE */
          <>
            {/* Linear Style Horizontal Progress Bar */}
            <div className="bg-[#FFFFFF] border border-border-light rounded-md p-4 space-y-3">
              {cycleState?.isCycleCompleted && (
                <div className="mb-3 p-3 bg-[#E6EEFF] text-[#0055FF] rounded border border-[#0055FF]/20 flex flex-col gap-3">
                  <div className="text-xs font-medium">your 11-week cycle has concluded.</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDebriefCycle} 
                      disabled={isDebriefing}
                      className="flex-1 flex justify-center items-center gap-2 bg-[#0055FF] text-white py-1.5 px-3 rounded text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {isDebriefing && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isDebriefing ? "analyzing history..." : "run cycle debrief"}
                    </button>
                    <button 
                      onClick={handleResetCycle} 
                      className="flex-1 bg-white text-[#0055FF] border border-[#0055FF] py-1.5 px-3 rounded text-xs font-medium hover:bg-[#E6EEFF]"
                    >
                      start new cycle
                    </button>
                  </div>
                  {userProfile.longTermMemory && (
                    <div className="text-[10px] bg-white/50 p-2 rounded mt-1 opacity-80 leading-relaxed font-mono">
                      <div className="font-semibold mb-1">Athlete Memory Updated:</div>
                      {userProfile.longTermMemory.substring(0, 100)}...
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-deep" />
                  <span className="text-text-secondary lowercase">periodization cycle: </span>
                  <span className="font-medium text-brand-deep lowercase">{cycleState?.phase}</span>
                </div>
                <div className="text-text-secondary">
                  week <span className="font-medium text-foreground">{cycleState?.currentWeek}</span> of 11
                </div>
              </div>

              {/* Segmented Weeks (11 blocks) */}
              <div className="flex w-full gap-1.5">
                {Array.from({ length: 11 }).map((_, idx) => {
                  const w = idx + 1;
                  const isCurrent = w === cycleState?.currentWeek;
                  const isPast = w < (cycleState?.currentWeek || 1);

                  return (
                    <div
                      key={w}
                      className={`h-1.5 flex-1 rounded-sm transition-all duration-300 ${
                        isCurrent
                          ? "bg-brand-deep ring-2 ring-brand-deep/30 scale-y-110"
                          : isPast
                          ? "bg-brand-deep/40"
                          : "bg-border-light"
                      }`}
                      title={`Week ${w}`}
                    />
                  );
                })}
              </div>

              {/* Sub-label indicators of block phases */}
              <div className="flex justify-between text-[9px] text-text-secondary uppercase tracking-wider font-mono border-t border-border-light pt-2">
                <span>Strength (W1-3)</span>
                <span>Hypertrophy (W4-6)</span>
                <span>Resistance (W7-8)</span>
                <span>Explosive (W9-10)</span>
                <span>Deload (W11)</span>
              </div>
            </div>

            {/* Split Day Status Card */}
            <div className="bg-[#FFFFFF] border border-border-light rounded-md p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-text-secondary lowercase">today's split: </span>
                  <span className="font-medium text-foreground lowercase">{cycleState?.dayName}</span>
                </div>
                <div className="text-[10px] bg-brand-soft text-brand-deep px-2 py-0.5 rounded font-mono lowercase flex items-center gap-1">
                  <Activity className="w-4 h-4" /> active
                </div>
              </div>
              <div className="text-xs text-text-secondary lowercase">
                {activeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {todaysLog ? (
              <div className="space-y-6">
                {/* Completion Status */}
                <div className="bg-[#FFFFFF] border border-border-light rounded-lg p-6 flex flex-col items-center text-center space-y-4 shadow-sm">
                  <div className="bg-green-50 p-4 rounded-full border border-green-100">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium lowercase mb-1 text-foreground">
                      session logged. great work!
                    </h3>
                    <p className="text-xs text-text-secondary lowercase leading-relaxed px-2">
                      i've safely stored your session data on this device. remember, muscle protein synthesis peaks 24-48h post-stimulus—so your only job now is to recover and let the adaptation happen. i'm proud of the effort today.
                    </p>
                  </div>

                  {/* Exercises Summary */}
                  <div className="w-full space-y-2">
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono text-left">session log</div>
                    {todaysLog.exercises.map((ex, idx) => {
                      const totalVol = ex.setsData.reduce((acc, s) => acc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs bg-[#F9F9FB] border border-border-light rounded px-3 py-2">
                          <span className="text-foreground lowercase font-medium">{ex.name}</span>
                          <span className="text-text-secondary font-mono text-[10px]">
                            {ex.setsData.length}s × {ex.setsData[0]?.reps || "?"} {totalVol > 0 ? `• ${totalVol.toLocaleString()} kg` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {todaysLog.why && (
                    <div className="p-3 bg-[#F9F9FB] border border-border-light rounded text-xs text-left text-text-secondary italic w-full">
                      "{todaysLog.why}"
                    </div>
                  )}
                </div>

                {/* Next Session Card */}
                {tomorrowState && (
                  <div className="bg-[#E6EEFF] border border-[#0055FF]/20 rounded-lg p-5 space-y-3 shadow-sm">
                    <h4 className="text-xs font-semibold text-[#0055FF] lowercase flex items-center gap-1.5 font-mono">
                      <ArrowRight className="w-4 h-4" /> next session preview
                    </h4>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-[#0055FF]/90 lowercase">
                        <strong className="text-[#0055FF] font-semibold">
                          {(() => {
                            const tomorrow = new Date(activeDate);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            return tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                          })()}
                        </strong>
                        {" "} — {tomorrowState.dayName}
                      </div>
                      <span className="text-[10px] bg-white/60 px-2 py-1 rounded-md text-[#0055FF] font-mono lowercase shadow-sm">
                        {tomorrowState.dayType}
                      </span>
                    </div>
                    <p className="text-xs text-[#0055FF]/80 leading-relaxed lowercase mt-2">
                      whenever you're ready tomorrow, open the app and log your recovery signals. i'll run the numbers through our constraint-compiler and synthesize a perfect protocol for your {tomorrowState.dayName} template. get some rest!
                    </p>
                  </div>
                )}

                {/* Regenerate Workout Override */}
                <div className="bg-[#FFFFFF] border border-border-light rounded-md p-4">
                  <button
                    onClick={() => {
                      if (confirm("This will clear today's logged workout and let you generate a new one. Your existing data for today will be lost. Continue?")) {
                        const updatedHistory = history.filter((h) => h.date !== todayStr);
                        setHistory(updatedHistory);
                        localStorage.setItem("freebox_history", JSON.stringify(updatedHistory));
                        setCurrentWorkout(null);
                        setWorkoutTracker({});
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-border-light text-text-secondary hover:text-foreground hover:border-brand-deep/30 rounded text-xs transition-colors cursor-pointer lowercase font-mono"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    override: regenerate today's workout
                  </button>
                  <p className="text-[10px] text-text-secondary text-center mt-2 lowercase">
                    use this if you need to redo today's session with different readiness levels.
                  </p>
                </div>

                {/* Science Explainer Card */}
                {getPhaseScienceDetail(todaysLog.phase) && (() => {
                  const science = getPhaseScienceDetail(todaysLog.phase)!;
                  return (
                    <div className="bg-[#FFFFFF] border border-border-light rounded-md p-5 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-mono">
                        <Activity className="w-4 h-4 text-brand-deep" />
                        sports science breakdown
                      </h4>
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium lowercase text-foreground">
                          {science.title} — focus: <span className="text-brand-deep font-mono">{science.focus}</span>
                        </div>
                        <p className="text-xs text-text-secondary lowercase leading-relaxed">
                          {science.text}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : isRestDay ? (
              /* B. SUNDAY REST DAY VIEW */
              <div className="bg-[#FFFFFF] border border-border-light rounded-lg p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-deep/10 shadow-sm">
                  <Heart className="w-8 h-8 text-brand-deep" />
                </div>
                <h3 className="text-lg font-medium mb-2 lowercase text-brand-deep">recovery protocol</h3>
                <p className="text-sm text-text-secondary mb-5 leading-relaxed lowercase px-4">
                  take it easy today. {getRecoveryMessage(cycleState.phase, activeDate)}
                </p>
                <div className="p-4 bg-[#F9F9FB] rounded-lg text-xs text-text-secondary text-left leading-relaxed border border-border-light shadow-inner">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-brand-deep" />
                    <span className="font-semibold text-foreground lowercase">from my lab notes:</span>
                  </div>
                  active supercompensation occurs during rest. without scheduled breaks, the central nervous system saturates, reducing muscle recruitment efficiency over time. i'll see you tomorrow for our next session!
                </div>
              </div>
            ) : isSkillsDay ? (
              /* C. SATURDAY SKILLS VIEW (Accordion style to prevent scrolling overflow) */
              <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-soft rounded text-brand-deep">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium lowercase">saturday skills</h3>
                    <p className="text-xs text-text-secondary lowercase">calisthenics and motor control</p>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed lowercase">
                  Saturday is dedicated to relative strength and bodyweight skills. Select a family below to record your active progression level.
                </p>

                {/* Calisthenics Accordion list */}
                <div className="border-t border-border-light pt-3 space-y-2">
                  {skillsLibraryJson.families.map((family) => {
                    const currentLevel = skills[family.id] || 1;
                    const levelItem = family.levels.find((l) => l.level === currentLevel);
                    const isOpen = family.id === activeFamilyId;

                    return (
                      <div 
                        key={family.id} 
                        className="border border-border-light rounded overflow-hidden transition-all duration-200"
                      >
                        {/* Header Bar */}
                        <button
                          onClick={() => setActiveFamilyId(isOpen ? null : family.id)}
                          className="w-full flex justify-between items-center p-3 bg-[#FDFDFD] hover:bg-[#FDFDFD] text-left transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-medium text-foreground lowercase">{family.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-brand-soft text-brand-deep px-1.5 py-0.5 rounded font-mono lowercase">
                              level {currentLevel}/6
                            </span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
                          </div>
                        </button>

                        {/* Collapsible Content */}
                        {isOpen && (
                          <div className="p-3 bg-[#FFFFFF] border-t border-border-light space-y-2 text-xs">
                            <div className="font-medium text-brand-deep">
                              {levelItem?.name}
                            </div>
                            <div className="text-text-secondary leading-relaxed italic">
                              {levelItem?.description}
                            </div>
                            <div className="text-[11px] text-text-secondary font-mono bg-[#FDFDFD] p-2 rounded">
                              <span className="font-semibold text-brand-deep uppercase text-[9px] tracking-wider block mb-0.5">target metric:</span>
                              {levelItem?.target}
                            </div>

                            {/* Level Adjustment Controls */}
                            <div className="flex gap-2 pt-2 border-t border-border-light mt-1">
                              <button
                                onClick={() => handleUpdateSkillLevel(family.id, Math.max(1, currentLevel - 1))}
                                disabled={currentLevel === 1}
                                className="px-2 py-1 bg-[#F9F9FB] border border-border-light text-[10px] rounded hover:bg-[#FDFDFD] disabled:opacity-40 cursor-pointer"
                              >
                                decrease level
                              </button>
                              <button
                                onClick={() => handleUpdateSkillLevel(family.id, Math.min(6, currentLevel + 1))}
                                disabled={currentLevel === 6}
                                className="px-2 py-1 bg-brand-deep text-white text-[10px] rounded hover:bg-opacity-95 ml-auto cursor-pointer"
                              >
                                increase level
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleFinishSkillsDay}
                  className="w-full py-2 bg-brand-deep text-white hover:bg-opacity-95 font-medium rounded text-sm transition-opacity cursor-pointer lowercase"
                >
                  register saturday skills
                </button>
              </div>
            ) : !currentWorkout ? (
              /* D. DAILY READINESS CHECK-IN (Braun refined sliders) */
              <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-soft rounded text-brand-deep">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium lowercase">how are we feeling today?</h3>
                    <p className="text-xs text-text-secondary lowercase">take 20 seconds to give me your metrics, and i'll calibrate today's training volume for you.</p>
                  </div>
                </div>

                {loading ? (
                  <SkeletonWorkout />
                ) : (
                  <>
                    <div className="space-y-5">
                      {/* Slider 1: Sleep */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-text-secondary lowercase">
                            <Moon className="w-5 h-5" /> sleep quality
                          </span>
                          <div className="text-right">
                            <span className="text-[10px] bg-brand-soft text-brand-deep px-1.5 py-0.5 rounded font-mono mr-2">{getSleepLabel(sleep)}</span>
                            <span className="font-mono text-text-secondary font-medium">{sleep}</span>
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          step="5"
                          value={sleep}
                          onChange={(e) => setSleep(Number(e.target.value))}
                          className="w-full h-1 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-deep"
                        />
                      </div>

                      {/* Slider 2: Energy */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-text-secondary lowercase">
                            <Zap className="w-5 h-5" /> energy level
                          </span>
                          <div className="text-right">
                            <span className="text-[10px] bg-brand-soft text-brand-deep px-1.5 py-0.5 rounded font-mono mr-2">{getEnergyLabel(energy)}</span>
                            <span className="font-mono text-text-secondary font-medium">{energy}</span>
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          step="5"
                          value={energy}
                          onChange={(e) => setEnergy(Number(e.target.value))}
                          className="w-full h-1 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-deep"
                        />
                      </div>

                      {/* Slider 3: Recovery */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-text-secondary lowercase">
                            <Flame className="w-5 h-5" /> muscle recovery
                          </span>
                          <div className="text-right">
                            <span className="text-[10px] bg-brand-soft text-brand-deep px-1.5 py-0.5 rounded font-mono mr-2">{getRecoveryLabel(recovery)}</span>
                            <span className="font-mono text-text-secondary font-medium">{recovery}</span>
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          step="5"
                          value={recovery}
                          onChange={(e) => setRecovery(Number(e.target.value))}
                          className="w-full h-1 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-deep"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateWorkout}
                      disabled={loading}
                      className="w-full py-3 bg-brand-deep text-white hover:bg-opacity-95 font-medium rounded text-sm transition-opacity cursor-pointer lowercase flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? "synthesizing..." : "generate protocol"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* E. WORKOUT TRACKING VIEW (Things 3 aligned table layout) */
              <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6 space-y-6">
                
                {/* Workout Header Info */}
                <div className="border-b border-border-light pb-4">
                  <div className="flex items-center gap-1 text-[10px] bg-brand-soft text-brand-deep px-2 py-0.5 rounded font-mono w-max lowercase mb-2">
                    <Dumbbell className="w-4 h-4" /> structured session
                  </div>
                  
                  {/* Scientific Why text in papiro box */}
                  <div className="p-3 bg-[#FDFDFD] border border-border-light rounded text-xs text-text-secondary leading-relaxed italic lowercase">
                    "{currentWorkout.why}"
                  </div>
                </div>

                {/* Exercises Tracker List */}
                <div className="space-y-6">
                  {currentWorkout.exercises.map((ex: any) => (
                    <div key={ex.exercise_id} className="space-y-3">
                      
                      {/* Exercise Name and Info */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground lowercase">
                          {ex.name}
                        </h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mt-0.5">
                          <span className="lowercase font-medium text-brand-deep">{ex.slot_type}</span>
                          <span>•</span>
                          <span>{ex.reps} reps</span>
                          <span>•</span>
                          {ex.intensity_pct_1rm && (
                            <>
                              <span>{ex.intensity_pct_1rm}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>rest: {ex.rest_min} min</span>
                        </div>
                      </div>

                      {/* Executions Cues Box */}
                      <div className="p-2.5 bg-[#FDFDFD] border border-border-light rounded text-[11px] text-text-secondary space-y-0.5">
                        <div className="font-semibold text-[9px] uppercase text-text-secondary tracking-wider flex items-center gap-1">
                          <BookOpen className="w-4 h-4" /> execution cues:
                        </div>
                        {ex.cues.map((cue: string, cidx: number) => (
                          <div key={cidx}>— {cue}</div>
                        ))}
                      </div>

                      {/* Sets Table Layout (Things 3 style) */}
                      <div className="overflow-x-auto border border-border-light rounded-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#FDFDFD] border-b border-border-light text-text-secondary text-[10px] uppercase tracking-wider font-mono">
                              <th className="py-2 px-3 font-normal w-20">set</th>
                              <th className="py-2 px-3 font-normal w-24" title="Type 'bw' for bodyweight">load</th>
                              <th className="py-2 px-3 font-normal w-24">reps</th>
                              <th className="py-2 px-3 font-normal w-16 text-right">done</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workoutTracker[ex.exercise_id]?.map((setData, sidx) => (
                              <tr 
                                key={sidx} 
                                className={`border-b border-border-light last:border-none transition-colors duration-200 ${
                                  setData.done ? "bg-[#FDFDFD]/50 text-text-secondary" : "bg-[#FFFFFF]"
                                }`}
                              >
                                <td className="py-2 px-3 font-mono text-[11px]">
                                  set {sidx + 1}
                                </td>
                                
                                {/* Weight Input cell */}
                                <td className="py-1 px-3">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="kg/bw"
                                      value={setData.weight}
                                      onChange={(e) => handleUpdateTracker(ex.exercise_id, sidx, "weight", e.target.value)}
                                      className="w-16 px-1.5 py-0.5 border border-border-light rounded text-center focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono text-[11px] disabled:opacity-40"
                                      disabled={setData.done}
                                    />
                                    <span className="text-[10px] text-text-secondary lowercase">kg</span>
                                  </div>
                                </td>

                                {/* Reps Input cell */}
                                <td className="py-1 px-3">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="0"
                                      value={setData.reps}
                                      onChange={(e) => handleUpdateTracker(ex.exercise_id, sidx, "reps", e.target.value)}
                                      className="w-12 px-1.5 py-0.5 border border-border-light rounded text-center focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono text-[11px] disabled:opacity-40"
                                      disabled={setData.done}
                                    />
                                    <span className="text-[10px] text-text-secondary lowercase">reps</span>
                                  </div>
                                </td>

                                {/* Checkbox Action cell */}
                                <td className="py-1 px-3 text-right">
                                  <button
                                    onClick={() => handleToggleSet(ex.exercise_id, sidx)}
                                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all duration-200 ml-auto cursor-pointer ${
                                      setData.done
                                        ? "bg-brand-deep border-brand-deep text-white scale-95"
                                        : "border-border-light hover:bg-[#FDFDFD]"
                                    }`}
                                  >
                                    {setData.done && <Check className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Workout Submit */}
                <div className="border-t border-border-light pt-4">
                  <button
                    onClick={handleFinishWorkout}
                    disabled={!isWorkoutFinished()}
                    className="w-full py-2 bg-brand-deep text-white hover:bg-opacity-95 font-medium rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer lowercase"
                  >
                    complete workout session
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </>
        )}
      </main>

      {/* Settings Overlay Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-md bg-[#FFFFFF] h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border-light mb-6">
                <h2 className="text-base font-semibold lowercase flex items-center gap-2 text-foreground">
                  <Settings className="w-5 h-5 text-brand-deep" />
                  settings & profile
                </h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-xs text-text-secondary hover:text-foreground cursor-pointer px-2 py-1 border border-border-light rounded font-mono"
                >
                  close
                </button>
              </div>

              <div className="space-y-6">
                {/* 1. Athlete Profile */}
                <div className="space-y-3 pb-6 border-b border-border-light">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-deep" />
                    athlete profile
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-text-secondary mb-1 lowercase font-mono">age</label>
                      <input 
                        type="number" 
                        value={userProfile.age}
                        onChange={(e) => {
                          const updated = { ...userProfile, age: e.target.value };
                          setUserProfile(updated);
                          localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                        }}
                        placeholder="e.g. 30"
                        className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-secondary mb-1 lowercase font-mono">weight (kg)</label>
                      <input 
                        type="number" 
                        value={userProfile.weight}
                        onChange={(e) => {
                          const updated = { ...userProfile, weight: e.target.value };
                          setUserProfile(updated);
                          localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                        }}
                        placeholder="e.g. 80"
                        className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1 lowercase font-mono">experience level</label>
                    <select 
                      value={userProfile.experience}
                      onChange={(e) => {
                        const updated = { ...userProfile, experience: e.target.value };
                        setUserProfile(updated);
                        localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                      }}
                      className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1 lowercase font-mono">injuries / limitations</label>
                    <input 
                      type="text" 
                      value={userProfile.limitations}
                      onChange={(e) => {
                        const updated = { ...userProfile, limitations: e.target.value };
                        setUserProfile(updated);
                        localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                      }}
                      placeholder="e.g. lower back pain (or leave blank)"
                      className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground"
                    />
                  </div>
                </div>

                {/* 2. Security Passcode */}
                <div className="space-y-3 pb-6 border-b border-border-light">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-deep" />
                    security passcode
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed lowercase">
                    Protects your Anthropic API tokens from unauthorized calls. Ensure this matches the <code>FREEBOX_PASSCODE</code> variable configured in Vercel.
                  </p>
                  <div className="space-y-2">
                    <input 
                      type="password" 
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        localStorage.setItem("freebox_access_passcode", e.target.value);
                        setPasscodeStatus("unknown"); // Reset status on change
                      }}
                      placeholder="enter security passcode"
                      className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPasscode}
                      disabled={passcodeStatus === "checking"}
                      className="w-full flex items-center justify-center gap-2 py-1.5 border border-border-light rounded text-xs text-text-secondary hover:text-foreground hover:border-brand-deep/30 transition-colors cursor-pointer font-mono lowercase disabled:opacity-50"
                    >
                      {passcodeStatus === "checking" ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> verifying...</>
                      ) : (
                        <><Shield className="w-3.5 h-3.5" /> test connection</>
                      )}
                    </button>
                    {/* Status Badge */}
                    {passcodeStatus === "valid" && (
                      <div className="flex items-center gap-1.5 text-[11px] text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1.5 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        connected — passcode is valid and API access is secured.
                      </div>
                    )}
                    {passcodeStatus === "open" && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 font-mono">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        open mode — no FREEBOX_PASSCODE env var is set on the server. anyone with the URL can use API credits.
                      </div>
                    )}
                    {passcodeStatus === "invalid" && (
                      <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5 font-mono">
                        <ShieldX className="w-3.5 h-3.5" />
                        invalid — the passcode does not match the server. workout generation will be blocked.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Living Memory */}
                <div className="space-y-3 pb-6 border-b border-border-light">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-brand-deep" />
                    intelligence memory
                  </h3>
                  {userProfile.longTermMemory ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-brand-soft border border-brand-deep/10 rounded text-[11px] text-text-secondary leading-relaxed font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {userProfile.longTermMemory}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to clear your long term training memory? The LLM coach will lose its historical intelligence context.")) {
                            const updated = { ...userProfile, longTermMemory: "" };
                            setUserProfile(updated);
                            localStorage.setItem("freebox_user_profile", JSON.stringify(updated));
                          }
                        }}
                        className="text-[10px] text-red-500 font-mono underline hover:text-red-600 cursor-pointer"
                      >
                        clear intelligence memory
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-secondary lowercase italic">
                      no distilled training memory present yet. memory is compiled automatically at the end of each 11-week cycle.
                    </p>
                  )}
                </div>

                {/* 4. Active Cycle Management */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-deep" />
                    cycle management
                  </h3>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1 lowercase font-mono">cycle start date</label>
                    <input 
                      type="date" 
                      value={cycleStartDate}
                      onChange={(e) => {
                        setCycleStartDate(e.target.value);
                        localStorage.setItem("freebox_cycle_start", e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 border border-border-light rounded bg-[#F9F9FB] text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep text-foreground font-mono"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleResetCycle();
                      }}
                      className="w-full py-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded text-xs transition-colors cursor-pointer lowercase flex items-center justify-center gap-1 font-mono"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      reset current cycle
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-border-light mt-6">
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2 bg-brand-deep text-white font-medium rounded text-xs hover:bg-opacity-95 cursor-pointer lowercase font-mono"
              >
                save and close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
