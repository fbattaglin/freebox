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

            <div className="pt-2">
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono mb-2">exercises executed</div>
              <div className="flex flex-wrap gap-2">
                {entry.exercises.map((ex, exIdx) => (
                  <span key={exIdx} className="px-2 py-1 bg-[#FDFDFD] border border-border-light rounded text-[10px] text-text-secondary">
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
