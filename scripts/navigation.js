// navigation.js — Handles switching between main sections
document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.querySelectorAll(".nav-button");
  const views = document.querySelectorAll(".view-section");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Deactivate all buttons and sections
      navButtons.forEach((b) => b.classList.remove("nav-button-active"));
      views.forEach((v) => v.classList.remove("active"));

      // Activate target view
      btn.classList.add("nav-button-active");
      const targetId = btn.dataset.target;
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add("active");

      // Save current tab in localStorage for persistence
      localStorage.setItem("uocExam_activeTab", targetId);
    });
  });

  // Restore last opened tab
  const lastTab = localStorage.getItem("uocExam_activeTab");
  if (lastTab) {
    document.querySelectorAll(".nav-button").forEach((b) => {
      if (b.dataset.target === lastTab) b.click();
    });
  } else {
    document.querySelector(".nav-button").click(); // default to first tab
  }
});
