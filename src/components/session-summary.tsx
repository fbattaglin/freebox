import { Award, Target, Activity } from "lucide-react";
import { LlmWorkoutOutput } from "@/lib/schemas";

interface SessionSummaryProps {
  workout: any; // The current generated workout structure
  tracker: { [exerciseId: string]: { weight: string; reps: string; done: boolean }[] };
  onClose: () => void;
}

export function SessionSummary({ workout, tracker, onClose }: SessionSummaryProps) {
  // Compute session metrics
  let totalSets = 0;
  let totalTonnage = 0;
  
  workout.exercises.forEach((ex: any) => {
    const sets = tracker[ex.exercise_id] || [];
    sets.forEach(set => {
      if (set.done) {
        totalSets += 1;
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        totalTonnage += (weight * reps);
      }
    });
  });

  return (
    <div className="bg-[#FFFFFF] border border-border-light rounded-md p-6 space-y-6 text-foreground">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-brand-soft rounded-full flex items-center justify-center mx-auto mb-3">
          <Award className="w-7 h-7 text-brand-deep" />
        </div>
        <h3 className="text-lg font-medium lowercase">session debrief</h3>
        <p className="text-sm text-text-secondary lowercase">
          Telemetric data captured. Supercompensation cycle initiated.
        </p>
      </div>

      {/* Tonnage / Volume Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-[#FDFDFD] border border-border-light rounded-sm flex flex-col items-center justify-center">
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">total tonnage</span>
          <span className="font-mono text-xl font-medium">{totalTonnage.toLocaleString()} <span className="text-xs text-text-secondary">kg</span></span>
        </div>
        <div className="p-4 bg-[#FDFDFD] border border-border-light rounded-sm flex flex-col items-center justify-center">
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">sets completed</span>
          <span className="font-mono text-xl font-medium">{totalSets}</span>
        </div>
      </div>

      {/* Scientific Impact */}
      <div className="p-4 bg-[#FDFDFD] border border-border-light rounded-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-text-secondary uppercase tracking-wider border-b border-border-light pb-2">
          <Activity className="w-3.5 h-3.5" /> cns & structural impact
        </div>
        <p className="text-sm leading-relaxed text-text-secondary italic">
          "{workout.why}"
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-brand-deep text-[#FFFFFF] hover:bg-[#E0E0E0] font-medium rounded text-sm transition-colors cursor-pointer lowercase mt-2"
      >
        conclude session
      </button>
    </div>
  );
}
