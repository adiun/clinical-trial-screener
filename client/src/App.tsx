import { Numerics } from "./components/Numerics.js";
import { Notice } from "./components/Notice.js";
import { Rail } from "./components/Rail.js";
import { Grid } from "./components/Grid.js";
import { Inspector } from "./components/Inspector.js";
import { ClaudeDrawer, EvalDrawer, JsonDrawer } from "./components/Drawers.js";
import { Toast } from "./components/Toast.js";
import { useStore } from "./store.js";

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const loadError = useStore((s) => s.loadError);
  const hasInspector = useStore((s) => s.selectedNoteId !== null);

  if (!loaded) {
    return (
      <div className="app app-loading" aria-busy="true">
        <span className="label">Connecting to the screener backend…</span>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="app app-loading">
        <p className="drawer-error">Backend unreachable: {loadError}</p>
        <p className="data">Start it with <code>npm run dev</code> and reload.</p>
      </div>
    );
  }

  return (
    <div className={`app${hasInspector ? " has-inspector" : ""}`}>
      <Numerics />
      <Notice />
      <main className="panes">
        <Rail />
        <Grid />
      </main>
      <Inspector />
      <EvalDrawer />
      <ClaudeDrawer />
      <JsonDrawer />
      <Toast />
    </div>
  );
}
