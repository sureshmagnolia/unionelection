// scripts/main.js
document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("run-button");
  const spinner = document.getElementById("spinner");
  const status = document.getElementById("status");

  // If PyScript is present, PyScript module will wire up start_extraction.
  // But keep a friendly JS fallback simulation if PyScript not loaded.
  runBtn.addEventListener("click", async () => {
    status.textContent = "> Starting extraction...\n";
    spinner.classList.remove("hidden");
    runBtn.disabled = true;

    // If pyscript has defined a global start_extraction function, call it
    if (typeof window.start_extraction === "function") {
      try {
        await window.start_extraction(); // extraction.py can set this
      } catch (e) {
        console.error(e);
        status.textContent += `> Error in PyScript extraction: ${e}\n`;
      } finally {
        spinner.classList.add("hidden");
        runBtn.disabled = false;
      }
      return;
    }

    // JS fallback: simulate
    await new Promise(res => setTimeout(res, 1200));
    status.textContent += "> Simulation complete. No PyScript detected.\n";
    spinner.classList.add("hidden");
    runBtn.disabled = false;
  });
});
