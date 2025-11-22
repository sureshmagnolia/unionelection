import pandas as pd
import pdfplumber
import re
import io
import js
from js import document, console, URL, Blob, window, localStorage
import asyncio
import json
from datetime import datetime

# ==========================================
# 🧠 SMART PARSING HELPERS (Universal)
# ==========================================

def clean_text(text):
    """Removes newlines and extra spaces."""
    if not text: return ""
    return str(text).replace('\n', ' ').strip()

def find_date_in_text(text):
    """Scans text for Date patterns (DD.MM.YYYY or DD-MM-YYYY)"""
    match = re.search(r'(\d{2}[./-]\d{2}[./-]\d{4})', text)
    if match:
        return match.group(1).replace('-', '.').replace('/', '.')
    return "Unknown"

def find_time_in_text(text):
    """Scans text for Time patterns (09:30 AM, 2.00 PM)"""
    text = text.upper().replace('.', ':')
    match = re.search(r'(\d{1,2}:\d{2})\s*(AM|PM)', text)
    if match:
        h, m = match.group(1).split(':')
        p = match.group(2)
        return f"{int(h):02d}:{m} {p}"
    return "Unknown"

def find_course_name(text):
    """
    Scans text for Course Name by actively removing known header garbage.
    """
    # 1. Flatten text
    text = re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip()
    
    # 2. Define Headers/Garbage to Remove (Regex)
    # We split the text by these patterns and keep the relevant part (usually after)
    garbage_patterns = [
        r"College\s*:\s*[\w\s,]*?PALAKKAD",  # Removes "College : ... PALAKKAD"
        r"Nominal\s*Roll",
        r"Examination\s*[\w\s]*?\d{4}",      # Removes "Examination ... 2025"
        r"Semester\s*FYUG",
        r"UNIVERSITY\s*OF\s*CALICUT",
        r"Details\s*of\s*candidates",
        r"Course\s*Code\s*:",
        r"\bCourse\s*[:-]?",                 # The word "Course" itself
        r"Paper\s*Details\s*[:-]?",
        r"Slot\s*[:\-]?\s*[\w\s\-]*?Core\s*\d+", # Removes "Slot : Single Major - Core 1"
        r"Slot\s*[:\-]?\s*[\w\s\-]*?MDC\s*\d+",
        r"Slot\s*[:\-]?\s*[\w\s\-]*?AEC\s*\d+"
    ]

    # 3. Destructive Cleaning
    for pattern in garbage_patterns:
        # Split by the garbage and take the LAST significant chunk.
        # This assumes the Course Name appears AFTER the headers.
        parts = re.split(pattern, text, flags=re.IGNORECASE)
        if len(parts) > 1:
            # Take the part that is likely the course name (usually the last part before metadata)
            text = parts[-1].strip()

    # 4. Stop at Metadata (The text AFTER the course name)
    stop_markers = r'(?=\s*(?:Exam\s*Date|Date\s*of|Slot|Session|Time|Register|Reg\.|Reg\s*No|Page|Maximum|Marks|$))'
    
    match = re.search(r'(.*?)' + stop_markers, text)
    if match:
        text = match.group(1).strip()

    # 5. Final Cleanup of leading punctuation (Fixes "] - English" or ") Course")
    text = re.sub(r'^[\s\-\)\]\.:,]+', '', text).strip()

    # 6. Validation: If we cut too much and have nothing, try specific capture
    if len(text) < 4:
        # Fallback: Look for Syllabus Tag
        syl_match = re.search(r'([A-Z0-9].*?\[[^\]]*?Syllabus\])', clean_text(text), re.IGNORECASE)
        if syl_match: return syl_match.group(1)
        return "Unknown"

    return text

def detect_columns(header_row):
    """Analyzes a header row to find indices for RegNo and Name."""
    reg_idx = -1
    name_idx = -1
    
    row_lower = [str(cell).lower().strip() if cell else "" for cell in header_row]
    
    for i, col in enumerate(row_lower):
        if "reg" in col or "register" in col or "roll" in col:
            reg_idx = i
        elif "name" in col or "candidate" in col or "student" in col:
            name_idx = i
            
    return reg_idx, name_idx

# ==========================================
# 🚀 MAIN PROCESSING LOGIC
# ==========================================

async def process_file(file):
    try:
        array_buffer = await file.arrayBuffer()
        file_bytes = array_buffer.to_bytes()
        pdf_file = io.BytesIO(file_bytes)
        extracted_data = []

        with pdfplumber.open(pdf_file) as pdf:
            
            # 1. Global Header Scan (First Page Only)
            first_page_text = ""
            if len(pdf.pages) > 0:
                # Use layout=True to keep words apart, helps with "Thinking [Computer" issue
                first_page_text = pdf.pages[0].extract_text() or ""
            
            global_date = find_date_in_text(first_page_text)
            global_time = find_time_in_text(first_page_text)
            global_course = find_course_name(first_page_text)

            # 2. Iterate Pages
            for page in pdf.pages:
                tables = page.extract_tables({
                    "vertical_strategy": "lines", 
                    "horizontal_strategy": "lines"
                })
                if not tables:
                    tables = page.extract_tables({
                        "vertical_strategy": "text", 
                        "horizontal_strategy": "text"
                    })

                if not tables: continue

                # 3. Iterate Tables
                for table in tables:
                    reg_idx, name_idx = -1, -1
                    
                    # A. Detect Headers
                    for row in table:
                        r_idx, n_idx = detect_columns(row)
                        if r_idx != -1 and n_idx != -1:
                            reg_idx, name_idx = r_idx, n_idx
                            break
                    
                    # B. Fallback Detection
                    if reg_idx == -1: 
                        sample_row = table[0] if table else []
                        if len(sample_row) >= 5:
                            for i, row in enumerate(table):
                                clean = [str(c).strip() if c else "" for c in row]
                                if len(clean) > 1 and re.search(r'[A-Z]+\d+', clean[1]):
                                    reg_idx = 1; name_idx = 2; break
                                if len(clean) > 4 and re.search(r'[A-Z]+\d+', clean[4]):
                                    reg_idx = 4; name_idx = 5; break

                    # C. Extraction
                    if reg_idx != -1 and name_idx != -1:
                        for row in table:
                            clean_row = [str(cell).strip() if cell else "" for cell in row]
                            if len(clean_row) <= max(reg_idx, name_idx): continue

                            row_str = " ".join(clean_row).lower()
                            if "register" in row_str or "name" in row_str or "reg.no" in row_str:
                                continue

                            val_reg = clean_text(clean_row[reg_idx])
                            val_name = clean_text(clean_row[name_idx])

                            if len(val_reg) < 3: continue
                            if len(val_name) < 2: continue

                            extracted_data.append({
                                "Date": global_date,
                                "Time": global_time,
                                "Course": global_course,
                                "Register Number": val_reg,
                                "Name": val_name
                            })

        return extracted_data

    except Exception as e:
        js.console.error(f"Python Error: {e}")
        return []

async def start_extraction(event):
    file_input = document.getElementById("pdf-file")
    file_list = file_input.files
    
    if file_list.length == 0:
        js.alert("Please select at least one PDF file.")
        return

    run_button = document.getElementById("run-button")
    spinner = document.getElementById("spinner")
    button_text = document.getElementById("button-text")
    status_div = document.getElementById("status")
    
    run_button.disabled = True
    run_button.classList.add("opacity-50", "cursor-not-allowed")
    spinner.classList.remove("hidden")
    button_text.innerText = "Processing..."
    status_div.innerText = "Starting extraction..."

    all_exam_rows = []
    
    try:
        for i in range(file_list.length):
            file = file_list.item(i)
            status_div.innerText = f"Processing file {i+1}/{file_list.length}: {file.name}..."
            
            data = await process_file(file)
            all_exam_rows.extend(data)
            
        status_div.innerText = "Sorting data..."
        
        def sort_key(row):
            try: d = datetime.strptime(row["Date"], "%d.%m.%Y")
            except: d = datetime.min
            try: t = datetime.strptime(row["Time"], "%I:%M %p")
            except: t = datetime.min
            return (d, t, row["Course"], row["Register Number"])

        all_exam_rows.sort(key=sort_key)

        json_data = json.dumps(all_exam_rows)
        js.window.handlePythonExtraction(json_data)

        status_div.innerText = f"Done! Extracted {len(all_exam_rows)} candidates."

    except Exception as e:
        js.alert(f"An error occurred: {str(e)}")
        status_div.innerText = "Error occurred."
        
    finally:
        run_button.disabled = False
        run_button.classList.remove("opacity-50", "cursor-not-allowed")
        spinner.classList.add("hidden")
        button_text.innerText = "Run Batch Extraction"

# Expose function to HTML
window.start_extraction = start_extraction
