// Development-only grid of every exercise demonstration, at both positions. Open /demo-preview.html in `npm run dev`.
import { createRoot } from "react-dom/client";
import { DemoFigure } from "./app/demos/ExerciseDemo";
import { DEMOS } from "./app/demos/poses";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <div className="grid grid-cols-6 gap-2 bg-background p-3">
    {Object.entries(DEMOS).map(([k, d]) => (
      <div key={k} className="col-span-2 grid grid-cols-2 gap-1 rounded border bg-card p-1">
        <div className="col-span-2 text-xs">{k}</div>
        <DemoFigure demo={{ ...d, b: d.a }} animate={false} />
        <DemoFigure demo={d} animate={false} />
      </div>
    ))}
  </div>,
);
