# Freebox — Product brief

Last updated: pre-MVP, foundation phase

This document is the source of truth for *why* Freebox exists, *what* it is, *who* it's for, and *what it deliberately is not*. When in doubt about a product decision, this is the file that arbitrates.

---

## The problem

People who train seriously in commercial gyms today fall into one of three traps:

**Generic tracking apps** (Fitbod, Hevy, Strong) — good logging, decent UX, but no real methodology. Workouts feel arbitrary or follow rules so opaque they might as well be. No real periodization. AI labels without AI substance.

**Science-heavy apps** (Renaissance Periodization, Juggernaut AI) — methodologically defensible, but intimidating, expensive, and built for athletes or specialists. The science is real; the experience is hostile.

**In-person gym methodologies** (CrossFit boxes, F45, Wolf Gym, Barry's) — well-structured when you're in class with a coach, but they don't follow you out the door. There's no coach on Saturday morning when you train alone. The methodology stays with the gym; you leave empty-handed.

The gap is specific: nothing combines a real periodization methodology with daily adaptation and accessible science communication in a tool that respects the user's autonomy and intelligence.

---

## What Freebox is

Freebox is a training app with one methodology, executed brilliantly.

It generates the right workout for today based on three inputs:

1. Where you are in an 11-week periodization cycle
2. What day of the week it is
3. How you're feeling, from a 20-second check-in

The methodology is block periodization with five phases over 11 weeks:

- Strength (3 weeks) — low reps, high intensity, neural adaptation
- Hypertrophy (3 weeks) — moderate reps, mechanical tension and volume
- Resistance (2 weeks) — high reps, density, metabolic stress
- Explosive (2 weeks) — velocity intent, plyometrics, rate of force development
- Deload (1 week) — supercompensation

The weekly split is Monday Lower / Tuesday Upper / Wednesday Full / Thursday Lower / Friday Upper / Saturday Skills.

The science is real. Phase parameters come from sports science literature (Schoenfeld 2016/2017, Helms et al. 2017, ACSM 2009, Cormie et al. 2011). The exercise library is hand-curated and tagged with phase compatibility, equipment requirements, and loading profiles. The LLM acts as a coach that picks from the library and adapts to today's readiness — within the boundaries of the methodology.

---

## Who it's for

### Primary user at MVP

The person building Freebox. Someone who:

- Trains 4–5 days a week at a serious commercial or functional gym
- Has multiple years of training experience
- Cares about evidence-based training
- Doesn't want to construct programs themselves
- Values autonomy but appreciates good structure

The MVP is a personal tool first. It must work brilliantly for one user before it tries to work for anyone else.

### Eventual users (V1 and beyond)

People who:

- Have at least 1 year of resistance training experience
- Train in commercial or functional gyms with standard equipment
- Want structure but value autonomy (the free-box mindset)
- Are curious about the science but allergic to fitness-bro culture
- Read like designers and engineers, not like coaches

### Explicitly not for

- True beginners (need supervised learning, not autonomy)
- Powerlifting/bodybuilding competition specialists (need specialized programs)
- People who want a conversational chatbot coach (Freebox is structured, not chatty)
- People looking for streaks, social feeds, and gamification
- People without access to a reasonably equipped gym

---

## What makes Freebox different

Three things only Freebox combines.

### 1. Methodology codified, not improvised

The 11-week cycle is fixed. Phase parameters derive from literature. The exercise library is curated, finite, and auditable. The LLM operates within these boundaries; it does not invent.

This is the opposite of most "AI fitness" apps, which let the LLM generate freely and call the freedom a feature. In Freebox, constraint is the feature. The science doesn't live in a prompt; it lives in versioned JSON files reviewed against the literature.

### 2. Readiness-driven adaptation without wearables

A 20-second daily check-in — sleep, energy, soreness, three sliders — adjusts the day's volume. Bad day? Sets get cut, intensity preserved. Good day? Volume sits at the top of the prescribed range. The phase never changes; only the dosage does.

Most apps with adaptive features require WHOOP, Garmin, Oura, or Apple Watch. Freebox needs zero hardware. The check-in takes less time than unlocking the app.

### 3. Science communication as a feature, not a footnote

Every workout has a one-line "why this." Every phase comes with an optional microinsight — "reps of 3–5 today activate neural adaptation; you get stronger without necessarily growing." Users learn what they're doing while they're doing it.

This builds informed users, not dependent ones. Over time the user understands their own training. That understanding is the long-term competitive moat — and the right thing to build.

---

## The soul of the product

If Freebox loses everything else and keeps only one thing, it's this:

> You open the app, do a 20-second check-in, and get the exact right workout for today — with one sentence that tells you why.

That sentence is the product. Everything else is supporting structure.

---

## MVP scope

### Inside MVP

- Cycle state tracking (current week, day, and phase calculated from cycle start date)
- Daily readiness check-in — three sliders (sleep, energy, soreness)
- Workout generation via LLM, adapted by readiness, drawing from `exercise-library.json` and `session-templates.json`
- One-line "why" for each session
- Complete session structure: warmup, core activation, main work, cooldown
- Simple log: mark exercise as done, record weight and reps
- Saturday skills mode: manual skill level tracking across 7 families (pull-up, dip, handstand, pistol, L-sit, front lever, muscle-up)
- PWA installable on Android via Chrome
- Single user (LocalStorage), no auth, no accounts

### Outside MVP — planned for V1

- Automatic load progression between cycles based on prior cycle data
- Post-set RPE input and real-time adjustment of remaining sets
- Educational microinsights surfaced during the workout
- Smart exercise variation across cycles to prevent accommodation
- Predictive deload suggestion based on accumulated fatigue signals
- Onboarding flow, user accounts, multi-user support
- Wearable integration (WHOOP, Garmin, Apple Watch)
- Analytics, trend visualization, cycle-over-cycle progress reports
- Skill progression intelligence (when to promote a level)

### Anti-features — not in MVP, not in V1, likely never

- Streak counters and "don't break your streak" notifications
- Badges, achievements, gamification of any kind
- Social feed, leaderboards, friend connections
- Motivational push notifications or copy
- User-created custom workouts
- Letting the user override the methodology structure
- Conversational chatbot interface

These are not features waiting to be prioritized. They are explicitly excluded from the product identity.

---

## Success criteria

### MVP success

The original user (the builder) completes one full 11-week cycle using only the app and considers it a better training experience than what they had before. Specifically:

- Used the app at least 4 days per week for 11 weeks
- Did not abandon the app to track elsewhere
- Reports the workouts felt appropriately challenging and varied
- Reports the readiness adaptation worked (not too soft, not too aggressive)

### V1 success criteria

To be defined after MVP completes. The shape of V1 success depends on what MVP reveals.

---

## Roadmap markers

**MVP** — personal tool, single user, validates methodology and core UX. Approximately 5–10 days of focused build.

**V1** — opens to a small invited group (5–20 users). Adds progression intelligence between cycles, RPE-based session adjustment, educational microinsights.

**V2** — public availability. Wearable integration. Analytics. Real onboarding flow.

**Future open questions** — coaching marketplace? Custom methodologies for advanced users? Specialized variants for specific sports? These are explicitly unresolved and don't need to be resolved now.

---

## Naming origin

"Free-box" is the term used at functional gyms (notably Wolf Gym in Mexico City, where this project was conceived) for the modality where members train without a class or coach present. They have free access to the box — the gym floor and its equipment — on their own terms.

Freebox is exactly that experience digitized: train autonomously, but with the structure and intelligence of a coach running underneath. The product name carries the cultural meaning of the original term while signaling what the experience is.

The name was chosen over Forma after the realization that "the experience" was a stronger anchor than "the result." See `decisions/002-name-freebox.md`.

---

## Inspirations and how Freebox differs from each

**Wolf Gym methodology** — the trigger. A 9-week cycle with a similar phase structure (Strength → Hypertrophy → Resistance → Explosive → Deload). Freebox extends to 11 weeks to give each adaptation phase more time, adds the daily readiness layer, and codifies what Wolf does in person.

**Renaissance Periodization** — the science reference. RP has academic depth but its app is intimidating and expensive. Freebox keeps the rigor, removes the friction, and makes the science feel native rather than imposed.

**Fitbod** — the UX reference for AI-driven fitness apps. Fitbod adapts smoothly but lacks a defensible methodology. Freebox does both: real methodology, real adaptation.

**Braun product design** — the aesthetic reference. Instruments of precision, not entertainment products. Form follows function. Every visible element earns its place.

**Linear** — the tone reference. Technical product with taste. Confident without being arrogant. Direct without being cold. No noise.

---

## Open product questions

These are documented to be revisited, not decided now.

- How does Freebox handle a user who joins mid-cycle? Start them on a partial first cycle? Wait until next phase boundary? This is a V1 question.
- Should the LLM consider time-of-day in adaptation? (Morning vs evening training has different optimal stimuli.) Likely not at MVP.
- Should Freebox eventually support women-specific cycle considerations (menstrual cycle phase awareness)? Worth research, not in MVP.
- Is the 11-week cycle ever a configurable length, or is it permanent? Strong default for now; revisit only with strong evidence the length is wrong.
