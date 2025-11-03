// scripts/reports.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Reports module loaded");
});

/**
 * Generates all reports from extracted data, room layout, and absentees.
 */
function generateReport() {
  const extractedRaw = localStorage.getItem("uocExam_extractedData");
  const savedRaw = localStorage.getItem("uocExamAppData");

  const output = document.getElementById("report-output");
  output.innerHTML = "";

  if (!extractedRaw || !savedRaw) {
    output.innerHTML = `<p class="text-red-600 font-medium">⚠️ Missing extracted data or saved settings.</p>`;
    return;
  }

  const extracted = JSON.parse(extractedRaw);
  const saved = JSON.parse(savedRaw);

  const absentees = (saved.absentees || "")
    .split(/[\s,]+/)
    .filter((a) => a.trim().length > 0);

  // Filter absentees
  const present = extracted.filter((s) => !absentees.includes(s.reg_no));

  // Build HTML report
  let html = `
    <div class="print-container">
      <div class="print-title">${saved.examName || "Exam Report"}</div>
      <div class="print-meta">Date: ${saved.examDate || "-"}</div>
      <div class="print-meta">Total Students: ${extracted.length}</div>
      <div class="print-meta">Absentees: ${absentees.length}</div>
      <div class="print-meta">Present: ${present.length}</div>

      <table class="print-table mt-3">
        <thead>
          <tr><th>#</th><th>Register No</th><th>Name</th><th>Course Code</th></tr>
        </thead>
        <tbody>
  `;

  present.forEach((s, idx) => {
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${s.reg_no}</td>
      <td>${s.name}</td>
      <td>${s.course_code}</td>
    </tr>`;
  });

  html += `
        </tbody></table>
        <div class="signature-line">
          <div>Invigilator Signature</div>
          <div>Chief Superintendent</div>
        </div>
    </div>
  `;

  output.innerHTML = html;
}
