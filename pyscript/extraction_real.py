# pyscript/extraction_real.py
# WARNING: Requires pdfminer.six installed in py-env; may be heavy for browser.
from js import document, console, localStorage, URL, Blob, FileReader
from pyodide.ffi import create_proxy
import asyncio, json, re
from pdfminer.high_level import extract_text

def log(msg):
    s = document.getElementById("status")
    if s: s.innerText += f"> {msg}\n"; s.scrollTop = s.scrollHeight

async def read_array_buffer(file):
    fut = asyncio.Future()
    def onload(evt): fut.set_result(evt.target.result.to_py())
    fr = __new__(FileReader())
    fr.onload = create_proxy(onload)
    fr.readAsArrayBuffer(file)
    return await fut

def parse_pdf_bytes(bytes_data):
    # write to a temp file in pyodide FS then extract_text
    path = "/tmp/tmp.pdf"
    with open(path, "wb") as f:
        f.write(bytes_data)
    text = extract_text(path)
    return text

async def start_extraction_real(event=None):
    log("Starting advanced PDF extraction (pdfminer)...")
    input_el = document.getElementById("pdf-file")
    if not input_el or input_el.files.length == 0:
        log("No files selected.")
        return
    combined = []
    for i in range(input_el.files.length):
        f = input_el.files.item(i)
        log(f"Reading {f.name}")
        arr = await read_array_buffer(f)
        text = parse_pdf_bytes(arr)
        # use same regex extractor
        pattern = r"(\d{4,})\s+([A-Za-z][A-Za-z\s\.\-']{1,80}?)\s+([A-Z]{2,}[0-9A-Z\-]*)"
        matches = re.findall(pattern, text)
        for m in matches:
            combined.append({"reg_no": m[0].strip(), "name": m[1].strip(), "course_code": m[2].strip()})
    localStorage.setItem("uocExam_extractedData", json.dumps(combined))
    # create download link
    keys = ["reg_no","name","course_code"]
    rows = [",".join(keys)] + [",".join([escape_csv(str(r.get(k,""))) for k in keys]) for r in combined]
    blob = Blob.new(["\n".join(rows)], { "type": "text/csv" })
    url = URL.createObjectURL(blob)
    a = document.createElement("a"); a.href = url; a.download = "Combined_Nominal_Roll.csv"; a.textContent = "📥 Download Combined_Nominal_Roll.csv"
    document.getElementById("status").appendChild(a)
    log(f"Saved {len(combined)} records.")
