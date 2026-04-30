# C Board

C Board is a clean, responsive control board built with React/Vite. It collects calculator tools and a Supabase-backed Progress Tracker in one place, using Tailwind CSS with the existing bold card style: cream background, thick black borders, rounded panels, colorful cards, and compact dashboard controls.

## Apps

- `Calculator Tools`
  - Percentage Calculator
  - Calorie Calculator
  - Mass Unit Converter
- `Progress Tracker`
  - Create custom goals
  - Add/remove goal metrics dynamically
  - Save daily metric entries
  - Edit/delete past entries
  - View target, latest, best, average, progress percentage, and streak
  - View multi-line progress charts powered by Recharts

## Supabase storage

All app data is stored in Supabase and scoped to the signed-in user with Row Level Security.

1. Create a Supabase project.
2. Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Only the anon key belongs in the frontend. Never expose a service role key.

Main tables:

- `profiles`
- `goals`
- `metrics`
- `entries`
- `entry_values`
- `calculator_results`
- `user_tool_preferences`
- `data_migrations`

Legacy data migration:

On first login, C Board checks for the old localStorage keys, migrates any goals, entries, calculator history, and mass-unit preferences into Supabase, then clears those legacy keys.

Auth supports email/password signup with a unique username. Users can log in with either their email address or username.

## Run locally

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

## Project structure

```text
src/
  app/
    App.jsx
    useHashRoute.js
  components/
    layout/
    pages/
      AuthPage.jsx
      LandingPage.jsx
      AppBoard.jsx
      NotFoundPage.jsx
    ui/
  features/
    calculators/
      CalculatorBoard.jsx
      calorie/
      mass/
      percentage/
      registry.js
    progressTracker/
      EntryForm.jsx
      GoalChart.jsx
      GoalForm.jsx
      GoalList.jsx
      GoalStats.jsx
      ProgressTracker.jsx
      progressTrackerStorage.js
  styles/
    index.css
```

## Routes

- `#/` Introduction page
- `#/login` Login and signup
- `#/board` Main app board
- `#/calculators` Calculator Tools
- `#/calculators/percentage` Percentage Calculator
- `#/calculators/calorie` Calorie Calculator
- `#/calculators/mass` Mass Unit Converter
- `#/progress-tracker` Progress Tracker

## How to add more calculators later

1. Create a new feature folder inside `src/features/calculators/`.
2. Add its UI component and calculation logic in that folder.
3. Register it in `src/features/calculators/registry.js`.
4. Reuse shared UI components from `src/components/ui/`.

## How to add more app sections later

1. Add the route in `src/app/App.jsx`.
2. Add the app card metadata in `src/components/pages/AppBoard.jsx`.
3. Keep feature-specific state and components inside `src/features/<featureName>/`.

This keeps each app isolated while sharing the same board, layout, and visual system.
