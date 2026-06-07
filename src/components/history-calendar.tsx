import { Calendar, Activity, Trash } from "lucide-react";

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

interface HistoryCalendarProps {
  history: LocalHistoryEntry[];
  onDelete?: (date: string) => void;
}

export function HistoryCalendar({ history, onDelete }: HistoryCalendarProps) {
  const formatLoad = (weight: string) => {
    if (!weight) return "bodyweight";
    const wLower = weight.trim().toLowerCase();
    if (wLower === "bw" || wLower === "body" || wLower === "bodyweight" || wLower === "0") {
      return "bodyweight";
    }
    return `${weight} kg`;
  };

  if (history.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6 text-center text-text-secondary">
        <Calendar className="w-7 h-7 mx-auto mb-2 opacity-50" />
        <p className="text-sm lowercase">no telemetric data logged yet.</p>
      </div>
    );
  }

  // Sort history newest first
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {sortedHistory.map((entry, idx) => {
        // Calculate tonnage
        let totalTonnage = 0;
        let totalSets = 0;
        entry.exercises.forEach(ex => {
          ex.setsData.forEach(set => {
            if (set.done) {
              totalSets++;
              const w = parseFloat(set.weight) || 0;
              const r = parseInt(set.reps) || 0;
              totalTonnage += (w * r);
            }
          });
        });

        return (
          <div key={idx} className="bg-[#FFFFFF] border border-border-light rounded-md p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-border-light pb-3">
              <div>
                <div className="text-xs text-text-secondary font-mono mb-1">{entry.date}</div>
                <h4 className="text-sm font-medium text-foreground lowercase">{entry.phase} / {entry.dayName}</h4>
              </div>
              <div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">volume</div>
                <div className="text-sm font-mono text-foreground mb-2">{totalTonnage.toLocaleString()} <span className="text-[10px]">kg</span></div>
                {onDelete && (
                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this session?")) {
                        onDelete(entry.date);
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 transition-colors ml-auto cursor-pointer font-mono"
                    title="Delete session"
                  >
                    <Trash className="w-4 h-4" />
                    delete
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-xs text-text-secondary italic leading-relaxed">
              "{entry.why}"
            </div>

            <div className="pt-3 border-t border-border-light mt-3 space-y-3">
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">execution details</div>
              <div className="space-y-3">
                {entry.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="bg-[#F9F9FB] border border-border-light rounded p-3">
                    <div className="text-xs font-medium text-foreground lowercase mb-2 flex justify-between items-center">
                      <span>{ex.name}</span>
                      <span className="text-[10px] text-text-secondary font-mono bg-[#FFFFFF] px-2 py-0.5 border border-border-light rounded">
                        {ex.setsData.length} sets
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {ex.setsData.map((set, sIdx) => (
                        <div key={sIdx} className="bg-[#FFFFFF] border border-border-light rounded px-2.5 py-1.5 text-[10px] text-text-secondary font-mono flex flex-col gap-0.5">
                          <span className="text-[9px] text-text-secondary/70">set {sIdx + 1}</span>
                          <span className="text-foreground">
                            {formatLoad(set.weight) === "bodyweight" ? (
                              <span className="text-text-secondary lowercase">bodyweight</span>
                            ) : (
                              <span>{set.weight} <span className="text-[8px] text-text-secondary/80">kg</span></span>
                            )}
                            {" x "}{set.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
