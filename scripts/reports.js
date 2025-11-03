// scripts/reports.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("reports.js loaded");
});

function generateReport() {
  const extractedRaw = localStorage.getItem("uocExam_extractedData");
  const savedRaw = localStorage.getItem("uocExamAppData");
  const out = document.getElementById("report-output");
  out.innerHTML = "";

  if (!extractedRaw) {
    out.innerHTML = `<p class="text-red-600 font-medium">⚠️ No extracted data found. Run extraction or upload corrected CSV.</p>`;
    return;
  }
  if (!savedRaw) {
    out.innerHTML = `<p class="text-red-600 font-medium">⚠️ No saved settings found. Please fill Settings and Room Settings.</p>`;
    return;
  }

  const extracted = JSON.parse(extractedRaw);
  const saved = JSON.parse(savedRaw);
  const absentees = (saved.absentees || "").split(/[\s,]+/).filter(a=>a);
  const present = extracted.filter(s => !absentees.includes(s.reg_no));

  let html = `
    <div class="print-container">
      <div class="print-title">${saved.examName || "Exam Report"}</div>
      <div class="print-meta">Date: ${saved.examDate || "-"}</div>
      <div class="print-meta">Total Extracted: ${extracted.length}</div>
      <div class="print-meta">Absentees: ${absentees.length}</div>
      <div class="print-meta">Present: ${present.length}</div>

      <table class="print-table mt-3">
        <thead><tr><th>#</th><th>Reg No</th><th>Name</th><th>Course</th></tr></thead>
        <tbody>
  `;

  present.forEach((s, i) => {
    html += `<tr><td>${i+1}</td><td>${s.reg_no}</td><td>${s.name}</td><td>${s.course_code || ""}</td></tr>`;
  });

  html += `</tbody></table>
    <div class="signature-line"><div>Invigilator Signature</div><div>Chief Superintendent</div></div>
    </div>`;

  out.innerHTML = html;
}
