import fs from "fs";
import path from "path";
import {
  ExerciseLibrarySchema,
  SessionTemplatesDatabaseSchema,
  SkillsLibrarySchema,
} from "../src/lib/schemas";

function logSuccess(message: string) {
  console.log(`\x1b[32m✓ ${message}\x1b[0m`);
}

function logError(message: string) {
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
}

function validateAll() {
  console.log("Starting validation of Freebox JSON databases...\n");
  let hasErrors = false;

  const dataDir = path.resolve(process.cwd(), "data");
  const exercisePath = path.join(dataDir, "exercise-library.json");
  const templatesPath = path.join(dataDir, "session-templates.json");
  const skillsPath = path.join(dataDir, "skills-library.json");

  // --- 1. Validate Exercise Library ---
  try {
    const exerciseData = JSON.parse(fs.readFileSync(exercisePath, "utf-8"));
    const parsedLibrary = ExerciseLibrarySchema.parse(exerciseData);
    logSuccess("exercise-library.json matches Zod schema.");

    // Logical checks on exercises
    const exerciseIds = new Set<string>();
    const exercises = parsedLibrary.exercises;
    
    // Check uniqueness of IDs
    for (const ex of exercises) {
      if (exerciseIds.has(ex.id)) {
        logError(`Duplicate exercise ID found: "${ex.id}"`);
        hasErrors = true;
      }
      exerciseIds.add(ex.id);
    }

    // Check that all substitutes point to actual exercise IDs
    for (const ex of exercises) {
      for (const subId of ex.substitutes) {
        if (!exerciseIds.has(subId)) {
          logError(`Exercise "${ex.id}" references non-existent substitute ID: "${subId}"`);
          hasErrors = true;
        }
      }
    }

    if (!hasErrors) {
      logSuccess(`Exercise library validated: ${exercises.length} exercises are structurally sound.`);
    }

  } catch (error: any) {
    logError("Failed to validate exercise-library.json");
    console.error(error.message || error);
    hasErrors = true;
  }

  console.log("");

  // --- 2. Validate Session Templates ---
  try {
    const templatesData = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));
    const parsedDb = SessionTemplatesDatabaseSchema.parse(templatesData);
    logSuccess("session-templates.json matches Zod schema.");

    const templates = parsedDb.templates;
    
    // Check count (should be exactly 25: 5 phases x 5 weekdays)
    if (templates.length !== 25) {
      logError(`Expected exactly 25 templates, found ${templates.length}.`);
      hasErrors = true;
    }

    // Check that each combination of phase and day is unique
    const uniqueKeys = new Set<string>();
    for (const t of templates) {
      const key = `${t.phase}-${t.day}`;
      if (uniqueKeys.has(key)) {
        logError(`Duplicate template combination found: Phase "${t.phase}", Day "${t.day}"`);
        hasErrors = true;
      }
      uniqueKeys.add(key);
    }

    if (!hasErrors) {
      logSuccess(`Session templates validated: all 25 phase/day combinations are unique and complete.`);
    }

  } catch (error: any) {
    logError("Failed to validate session-templates.json");
    console.error(error.message || error);
    hasErrors = true;
  }

  console.log("");

  // --- 3. Validate Skills Library ---
  try {
    const skillsData = JSON.parse(fs.readFileSync(skillsPath, "utf-8"));
    const parsedLibrary = SkillsLibrarySchema.parse(skillsData);
    logSuccess("skills-library.json matches Zod schema.");

    const families = parsedLibrary.families;

    // Logical checks on skills
    for (const family of families) {
      // Check that levels are exactly 1 to 6 in order
      const levels = family.levels;
      for (let i = 0; i < 6; i++) {
        const expectedLevel = i + 1;
        if (levels[i].level !== expectedLevel) {
          logError(`Family "${family.id}" has invalid level order or value at index ${i}. Expected level ${expectedLevel}, found ${levels[i].level}.`);
          hasErrors = true;
        }
      }
    }

    if (!hasErrors) {
      logSuccess(`Skills library validated: all ${families.length} families have exactly 6 sequential levels.`);
    }

  } catch (error: any) {
    logError("Failed to validate skills-library.json");
    console.error(error.message || error);
    hasErrors = true;
  }

  console.log("");

  if (hasErrors) {
    logError("Validation failed. Please correct the errors above.");
    process.exit(1);
  } else {
    logSuccess("All database JSON files are fully valid and integrated!");
    process.exit(0);
  }
}

validateAll();
