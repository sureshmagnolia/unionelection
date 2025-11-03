function generateReport() {
  const extracted = JSON.parse(localStorage.getItem("examBaseData") || "[]");
  const appData = JSON.parse(localStorage.getItem("uocExamAppData") || "{}");
  const out = document.getElementById("report-output");
  if (!extracted.length) {
    out.innerHTML = "<p class='text-red-600'>No extracted data available.</p>";
    return;
  }

  const absentees = (appData.absentees || "").split(/[\s,]+/).filter(Boolean);
  const present = extracted.filter(x => !absentees.includes(x["Register Number"]));

  let html = `<div class="print-container">
  <div class="print-title">${appData.examName || "Exam Report"}</div>
  <div class="print-meta">Date: ${appData.examDate || "-"}</div>
  <div class="print-meta">Total Students: ${extracted.length}</div>
  <div class="print-meta">Present: ${present.length}, Absentees: ${absentees.length}</div>
  <table class="print-table mt-3"><thead><tr><th>#</th><th>Reg No</th><th>Name</th><th>Course</th></tr></thead><tbody>`;
  present.forEach((s,i)=> html += `<tr><td>${i+1}</td><td>${s["Register Number"]}</td><td>${s["Name"]}</td><td>${s["Course"]}</td></tr>`);
  html += `</tbody></table></div>`;
  out.innerHTML = html;
}
