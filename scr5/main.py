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
# 🧠 SMART PARSING HELPERS
# ==========================================

def clean_text(text):
    """Standardizes text: removes newlines, extra spaces."""
    if not text: return ""
    return re.sub(r'\s+', ' ', str(text).replace('\n', ' ')).strip()

def find_date_in_text(text):
    """Finds date (DD.MM.YYYY)"""
    match = re.search(r'(\d{2}[./-]\d{2}[./-]\d{4})', text)
    if match:
        return match.group(1).replace('-', '.').replace('/', '.')
    return "Unknown"

def find_time_in_text(text):
    """Finds time (09:30 AM / 02:00 PM)"""
    text = text.upper().replace('.', ':')
    match = re.search(r'(\d{1,2}:\d{2})\s*(AM|PM)', text)
    if match:
        h, m = match.group(1).split(':')
        p = match.group(2)
        return f"{int(h):02d}:{m} {p}"
    return "Unknown"

def find_course_name(text):
    """
    Robust extraction of Course Name using Anchors.
    Target format: "CODE - Title [Syllabus Tag]"
    """
    # 1. Flatten text to handle multi-line names
    clean_page = re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip()

    # --- STRATEGY 1: High-Precision Code & Syllabus Match ---
    # Matches: "ENG1FA101(1B) - Title... [English 2024 syllabus]"
    # Regex breakdown:
    #  \b[A-Z]{3}\d      -> Starts with 3 letters + 1 digit (e.g. ENG1, HIN1)
    #  [A-Z0-9\(\)\-]{2,}-> Followed by code chars (e.g. FA101(1B))
    #  .*?               -> The Course Title (non-greedy)
    #  \[[^\]]*?Syllabus\] -> Ends with [ ... Syllabus]
    
    pattern_strict = r'([A-Z]{3}\d[A-Z0-9\(\)\-\s]{2,}.*?\[[^\]]*?Syllabus\])'
    match = re.search(pattern_strict, clean_page, re.IGNORECASE)
    if match:
        return clean_text(match.group(1))

    # --- STRATEGY 2: Label-Based (Fallback) ---
    # Looks for "Course: ... [Syllabus]"
    pattern_label = r'(?:Course|Paper)\s*[:\-]?\s*(.*?\[[^\]]*?Syllabus\])'
    match = re.search(pattern_label, clean_page, re.IGNORECASE)
    if match:
        candidate = clean_text(match.group(1))
        # Filter out "Code:" if it got caught
        candidate = re.sub(r'Code\s*:', '', candidate, flags=re.IGNORECASE).strip()
        return candidate

    # --- STRATEGY 3: Desperation (Just the Syllabus Block) ---
    # Finds "... [Syllabus]" and grabs previous 10 words
    # Useful for names like "BHAG I [Hindi 2025 syllabus]" which lack a standard code
    pattern_lazy = r'([^:]{10,150}?\[[^\]]*?Syllabus\])'
    match = re.search(pattern_lazy, clean_page, re.IGNORECASE)
    if match:
        candidate = clean_text(match.group(1))
        # Cleanup common prefixes that might have leaked in
        garbage = [r'.*?College\s*:', r'.*?Roll\s*', r'.*?Examination\s*']
        for g in garbage:
            candidate = re.sub(g, '', candidate, flags=re.IGNORECASE)
        return candidate.strip()

    return "Unknown"

def detect_columns(header_row):
    """Finds column indices for RegNo and Name"""
    reg_idx = -1
    name_idx = -1
    row_lower = [str(cell).lower().strip() if cell else "" for cell in header_row]
    
    for i, col in enumerate(row_lower):
        if "reg" in col or "register" in col or "roll" in col: reg_idx = i
        elif "name" in col or "candidate" in col or "student" in col: name_idx = i
    return reg_idx, name_idx

# ==========================================
# 🚀 MAIN PROCESSING
# ==========================================

async def process_file(file, filename):
    try:
        array_buffer = await file.arrayBuffer()
        pdf_file = io.BytesIO(array_buffer.to_bytes())
        extracted_data = []

        with pdfplumber.open(pdf_file) as pdf:
            # 1. Global Header Scan (First Page)
            first_page_text = ""
            if len(pdf.pages) > 0:
                # layout=True helps keep columns separated in text view
                first_page_text = pdf.pages[0].extract_text(layout=True) or ""
            
            # Run finders
            global_date = find_date_in_text(first_page_text)
            global_time = find_time_in_text(first_page_text)
            global_course = find_course_name(first_page_text)

            # 2. Iterate Pages
            for page in pdf.pages:
                # Use Lattice for grids (Most UOC files)
                tables = page.extract_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
                
                # Fallback to Text (Stream) if lines missing
                if not tables:
                    tables = page.extract_tables({"vertical_strategy": "text", "horizontal_strategy": "text"})

                if not tables: continue

                for table in tables:
                    reg_idx, name_idx = -1, -1
                    
                    # Detect Header Row
                    for row in table:
                        r, n = detect_columns(row)
                        if r != -1 and n != -1:
                            reg_idx, name_idx = r, n
                            break
                    
                    # Fallback Column Detection (Standard UOC positions)
                    if reg_idx == -1:
                        sample = table[0] if table else []
                        if len(sample) >= 5:
                            # Check standard cols (1=Reg, 2=Name) OR (4=Reg, 5=Name)
                            for i, row in enumerate(table[:3]):
                                c = [str(x).strip() if x else "" for x in row]
                                # RegNo pattern: VPA... or numbers
                                if len(c) > 2 and re.search(r'[A-Z]{3,}\d+', c[1]):
                                    reg_idx, name_idx = 1, 2; break
                                if len(c) > 5 and re.search(r'[A-Z]{3,}\d+', c[4]):
                                    reg_idx, name_idx = 4, 5; break

                    # Extract Data
                    if reg_idx != -1 and name_idx != -1:
                        for row in table:
                            # Safety
                            if len(row) <= max(reg_idx, name_idx): continue
                            
                            # Clean cells
                            val_reg = clean_text(row[reg_idx])
                            val_name = clean_text(row[name_idx])

                            # Skip Headers embedded in data
                            if "register" in val_reg.lower() or "name" in val_name.lower(): continue
                            
                            # Skip empty/short rows
                            if len(val_reg) < 4 or len(val_name) < 2: continue

                            extracted_data.append({
                                "Date": global_date,
                                "Time": global_time,
                                "Course": global_course,
                                "Register Number": val_reg,
                                "Name": val_name,
                                "Source File": filename 
                            })

        return extracted_data

    except Exception as e:
        js.console.error(f"Python Error in {filename}: {e}")
        return []

async def start_extraction(event):
    file_input = document.getElementById("pdf-file")
    file_list = file_input.files
    
    if file_list.length == 0:
        js.alert("Please select at least one PDF file.")
        return

    # UI Controls
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
            data = await process_file(file, file.name)
            all_exam_rows.extend(data)
            
        # Sort
        status_div.innerText = "Sorting data..."
        def sort_key(row):
            try: d = datetime.strptime(row["Date"], "%d.%m.%Y")
            except: d = datetime.min
            try: t = datetime.strptime(row["Time"], "%I:%M %p")
            except: t = datetime.min
            return (d, t, row["Course"], row["Register Number"])

        all_exam_rows.sort(key=sort_key)

        # Handoff
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

window.start_extraction = start_extraction
