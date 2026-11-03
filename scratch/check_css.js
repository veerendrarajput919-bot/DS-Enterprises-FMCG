const fs = require("fs");
const css = fs.readFileSync("assets/css/style.css", "utf8");

[
  ".ds-main-content",
  ".ds-panel {",
  ".ds-panel-header {",
  ".form-group {",
  ".form-control {",
  ".ds-table th,",
  ".kpi-grid {",
  ".kpi-card {"
].forEach(sel => {
  const idx = css.indexOf(sel);
  if (idx !== -1) {
    console.log(css.substring(idx, idx + 200));
    console.log("-------------------");
  }
});

