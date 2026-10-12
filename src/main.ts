// Entry point for the browser UI. The game engine lives in src/engine and the
// terminal-style UI in src/ui; both are built out under the Beads issues.

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.textContent = "PyPan — coming soon, Taipan.";
}
