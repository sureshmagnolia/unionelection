document.addEventListener("DOMContentLoaded", () => {
  const up = id => document.getElementById(id);
  up("load-csv-btn").onclick = async () => {
    const file = up("csv-upload").files[0];
    if (!file) return alert("Select a CSV file first.");
    const text = await file.text();
    renderEditableCSV(text);
  };
  up("save-corrections-btn").onclick = () => {
    const csv = tableToCSV();
    localStorage.setItem("uocExam_correctedCSV", csv);
    alert("Corrections saved.");
  };
  up("download-csv-btn").onclick = () => {
    const csv = localStorage.getItem("uocExam_correctedCSV");
    if (!csv) return alert("No data saved.");
    download(csv, "Corrected_Nominal_Roll.csv");
  };
  up("merge-corrections-btn").onclick = () => {
    const csv = localStorage.getItem("uocExam_correctedCSV");
    const parsed = csvToObjects(csv);
    localStorage.setItem("examBaseData", JSON.stringify(parsed));
    alert("Merged corrected data.");
  };

  const container = up("csv-table-container");
  function renderEditableCSV(text) {
    const rows = text.trim().split(/\r?\n/).map(r=>r.split(","));
    let html = "<table>";
    rows.forEach((r,i)=>{
      html += "<tr>"+r.map(c=>i?`<td><input value='${c}'/></td>`:`<th>${c}</th>`).join("")+"</tr>";
    });
    container.innerHTML = html+"</table>";
  }
  function tableToCSV(){
    const rows = Array.from(container.querySelectorAll("tr")).map(tr=>
      Array.from(tr.children).map(td=>{
        const i = td.querySelector("input"); return (i?i.value:td.textContent).replace(/,/g," ");
      }).join(","));
    return rows.join("\n");
  }
  function csvToObjects(csv){
    const lines = csv.trim().split(/\r?\n/);
    const headers = lines[0].split(",");
    return lines.slice(1).map(l=>{
      const cols = l.split(",");
      const obj={};
      headers.forEach((h,i)=>obj[h]=cols[i]);
      return obj;
    });
  }
  function download(data, name){
    const blob = new Blob([data],{type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download=name; a.click();
  }
});
