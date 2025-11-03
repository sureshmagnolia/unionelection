// main.js — Core actions for extractor and reports
document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("run-button");
  const spinner = document.getElementById("spinner");
  const status = document.getElementById("status");

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      status.textContent = "> Starting extraction...\n";
      spinner.classList.remove("hidden");
      runBtn.disabled = true;

      // Simulated long task
      setTimeout(() => {
        spinner.classList.add("hidden");
        runBtn.disabled = false;
        status.textContent += "> Extraction complete. Data saved.\n";
      }, 2000);
    });
  }
});

/* ---- Reports placeholder ---- */
function generateReport() {
  const reportDiv = document.getElementById("report-output");
  reportDiv.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-md border border-gray-300 mt-3">
      <p class="text-sm text-gray-700">Report generation placeholder — connect data processing here.</p>
    </div>`;
}
