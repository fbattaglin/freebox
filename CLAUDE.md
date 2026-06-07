# Freebox

> A free-box no seu bolso. Estrutura de coach, autonomia de quem treina.

This file loads automatically at the start of every Claude Code session in this project. Read it first. It contains the non-negotiable foundations of Freebox — identity, constraints, principles, and project map.

For depth on any topic below, see the referenced doc.

---

## What Freebox is

Freebox is a training app built on block periodization with intelligent daily adaptation.

The user opens it, does a 20-second readiness check-in, and receives a workout precisely calibrated for today — backed by sports science and explained in one sentence.

The name comes from gym culture: a "free-box" is the modality where you train without a class or coach present. Freebox is exactly that — but with the science of a coach running invisibly underneath.

See `docs/product-brief.md` for the full positioning, target user, differentiators, and roadmap.

---

## The non-negotiables

These constraints don't get debated per-session. They shape every decision.

### Science lives in the system, not in the LLM

Scientific rigor lives in two curated artifacts:

- `data/exercise-library.json` — 63 hand-tagged exercises with movement patterns, muscle groups, phase roles, loading profiles, equipment requirements
- `data/session-templates.json` — 20 templates (5 phases × 4 weekday slots + skills day) with volume, intensity, rest, and movement patterns derived from literature

The LLM is a selector and adapter. It never invents exercises. It picks from the library to fill slots in the template, then adapts volume based on readiness. The code enforces this boundary — if the LLM returns an exercise not in the library, the request fails.

See `docs/architecture.md` for the three-layer design and prompt strategy.

### Equipment scope is finite and explicit

Only equipment present in `data/exercise-library.json` may appear in any workout. Tiers:

- **Essential** — always assume: barbell + plates, dumbbells, bench (flat and incline), rack, pull-up bar, cable/lat machine, bodyweight, kettlebell, plyo box
- **Common** — assumed present in most gyms: leg press, chest press machine, row machine, leg curl/extension, smith machine, medicine ball, bands
- **Specific** — only as substitute, never as primary: hack squat, GHD
- **Exotic** — excluded entirely: trap bar, safety squat bar, atlas stones, sled/prowler, rings, any CrossFit-specific equipment

If a session needs an exercise outside the library, the answer is to expand the library — never to invent on the fly.

### The methodology is fixed at MVP

The cycle is 11 weeks: Strength (3 weeks) → Hypertrophy (3 weeks) → Resistance (2 weeks) → Explosive (2 weeks) → Deload (1 week).

The weekly split is fixed: Monday Lower / Tuesday Upper / Wednesday Full / Thursday Lower / Friday Upper / Saturday Skills.

No user customization of structure at MVP. The methodology IS the product. See `docs/methodology.md` for the science behind each parameter.

### Adaptation only through readiness at MVP

The only personalization at MVP is the daily readiness check-in: three sliders (sleep, energy, soreness) that adjust the day's volume.

Explicitly out of scope at MVP:

- Fitness level questionnaire
- Goal selection (cutting, bulking, etc.)
- Equipment preferences per user
- Custom alternative exercises chosen by user
- Multiple users / accounts

This is not a permanent constraint — it is a scope discipline for MVP. Personalization features are V1 territory.

---

## Identity

### Voice

Precise, direct, confident, educational, sober. The opposite of motivational fitness apps.

What Freebox says:

- "Week 2 of strength. Lower body. Given your check-in, we keep intensity but cut one set per exercise."
- "Reps of 3–5 activate neural adaptation today. You get stronger without necessarily growing — by design."
- "Cycle 1 complete. Average deadlift load up 8% versus week 1. Next cycle starts Monday."

What Freebox never says:

- Anything with exclamation marks or all-caps
- "You crushed it" / "amazing job" / any motivational filler
- "Great work, athlete!"
- Streak language ("don't break your streak")

### Visual references

Braun (precision, function). Things 3 (clarity without coldness). Linear (technical product with taste). Not Nike Training. Not Fitbod. Not Strava.

Palette: neutral warm base, single deep accent (blue or teal — to be finalized). No gradients. No neon. No shadows except functional focus rings. Generous whitespace.

### Formatting rules

- Sentence case everywhere. Never Title Case. Never ALL CAPS.
- No emojis in product copy.
- Two type weights only: 400 regular, 500 medium. Never 600 or 700.
- No motivational filler. Ever.

See `docs/identity.md` for full design tokens, typography scale, and component principles.

---

## Product principles

These four principles arbitrate every product decision.

**1. Every recommendation has a reason.** The app never instructs without the why being accessible. Not as disclaimer — as feature. "3×5 today because we're in strength: low volume, high neural demand."

**2. Adapt today, respect the cycle.** Readiness adjusts volume; it never changes the phase. Bad day → fewer sets, same intensity. Good day → volume at prescribed top of range. Intelligence lives inside the structure, not against it.

**3. Progress is the product.** No streaks. No badges. No vanity metrics. The app measures and surfaces real progress: load increases, density gains, skill level-ups between cycles.

**4. Simple surface, deep intelligence.** The visible UI is clean. The science underneath is serious. Never the inverse — never complex visuals hiding shallow logic.

---

## Project map

```
/CLAUDE.md                       you are here, loaded every session
/docs/
  product-brief.md               the why and the what
  methodology.md                 the science codified
  identity.md                    voice, visual, design tokens
  architecture.md                three layers, prompt strategy, code patterns
/data/
  exercise-library.json          63 exercises — source of truth
  session-templates.json         20 templates — source of truth
  skills-library.json            18 skill progressions for Saturday
/decisions/
  001-block-periodization.md     ADRs with rationale
  002-name-freebox.md
  003-pwa-not-native.md
  004-curated-library-vs-llm-freedom.md
  ...
/src/
  app/                           Next.js App Router routes
  components/                    UI components
  lib/                           data access, cycle math, utilities
  prompts/                       LLM prompts as versioned code
```

---

## Tech stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **State:** LocalStorage at MVP; Vercel KV for cross-device sync in V1
- **LLM:** Anthropic Claude API (Sonnet — balance of cost, latency, quality)
- **Hosting:** Vercel
- **Distribution:** PWA — installable on Android via Chrome "Add to home screen"

No native app at MVP. No React Native. No mobile-specific tooling. The PWA is the product surface.

See `docs/architecture.md` for the full stack rationale.

---

## How to open a session

Every Claude Code session needs three things stated up front:

1. **The objective** — one task, one outcome
2. **The relevant docs** — which files in `/docs/` apply
3. **Any session-specific override** — if anything in this CLAUDE.md is being temporarily overridden

Example of a good session opening:

> "Implement the readiness check-in screen at `/checkin`. Consult `docs/identity.md` for the visual treatment of sliders and `docs/architecture.md` section 'Readiness → LLM' for the data flow. The screen should write to LocalStorage under key `readiness:{date}`."

Example of a bad opening:

> "Continue building the app from where we left off."

Claude Code has no memory of prior sessions. Every session starts fresh with this CLAUDE.md plus whatever you explicitly load. Scope your asks accordingly.

---

## Anti-patterns

Things that should not happen, and should be pushed back on if requested:

- Adding features without updating `CLAUDE.md` or the relevant doc first
- Letting the LLM "improvise" workouts (must always go through library + template)
- Putting equipment in exercises that isn't in the tier list
- Motivational UI copy, streak counters, badges
- User-facing customization at MVP (one methodology, executed brilliantly)
- Optimizing for LLM token cost over methodology integrity
- Generating workouts that vary between identical inputs (deterministic where structure dictates, adaptive only where readiness dictates)

---

## Project status

MVP in active development. Personal tool first — validated by the original builder completing one full 11-week cycle.

Opens to a small invited group only after MVP self-validation.
