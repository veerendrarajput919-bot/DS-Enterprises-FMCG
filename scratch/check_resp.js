const fs = require("fs");
const css = fs.readFileSync("assets/css/responsive.css", "utf8");

[
  ".kpi-grid",
  ".kpi-card",
  ".ds-main-content",
  ".ds-panel",
  ".quick-actions-bar",
  ".quick-action-btn"
].forEach(sel => {
  const idx = css.indexOf(sel);
  if (idx !== -1) {
    console.log(css.substring(idx, idx + 200));
    console.log("-------------------");
  }
});

