// V90 FIX: Aggressive Key Cleaning Function
export function cleanCourseKey(courseName) {
    if (typeof courseName !== 'string') return '';
    let cleaned = courseName.toUpperCase();
    
    const codeMatch = cleaned.match(/([A-Z]{3}\d[A-Z]{2}\d{3})/);
    const syllabusMatch = cleaned.match(/(\d{4})\s+SYLLABUS/);
    
    let key = '';
    if (codeMatch) key += codeMatch[1];
    if (syllabusMatch) key += syllabusMatch[1];
    
    if (!key) {
        cleaned = cleaned.replace(/[\ufeff\u00A0\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, ' ').toUpperCase(); 
        cleaned = cleaned.replace(/[^\w\s\-\(\)\[\]\/&,;.]/g, ''); 
        key = cleaned.replace(/\s+/g, ' ').trim();
    }
    return key;
}        

// Helper function to numerically sort room keys
export function getNumericSortKey(key) {
    const parts = key.split('_'); // Date_Time_Room 1
    const roomPart = parts[2] || "Room 0";
    const roomNumber = parseInt(roomPart.replace('Room ', ''), 10);
    return `${parts[0]}_${parts[1]}_${String(roomNumber).padStart(4, '0')}`;
}

// Helper for Absentee Report
export function formatRegNoList(regNos) {
    if (!regNos || regNos.length === 0) return '<em>None</em>';
    
    let lastPrefix = "";
    const outputHtml = [];
    const regEx = /^([A-Z]+)(\d+)$/; 

    regNos.sort(); 
    
    regNos.forEach((regNo, index) => {
        const match = regNo.match(regEx);
        if (match) {
            const prefix = match[1];
            const number = match[2];
            
            if (prefix === lastPrefix) {
                outputHtml.push(`<span>, ${number}</span>`);
            } else {
                lastPrefix = prefix;
                if(outputHtml.length > 0) outputHtml.push('<br>');
                outputHtml.push(`<span>${regNo}</span>`);
            }
        } else {
            if(outputHtml.length > 0) outputHtml.push('<br>');
            outputHtml.push(`<span>${regNo}</span>`);
            lastPrefix = ""; // Reset prefix
        }
    });
    
    return outputHtml.join('');
}

// Helper function to create a new room row HTML (with location)
export function createRoomRowHtml(roomName, capacity, location, isLast = false) {
    const removeButtonHtml = isLast ? 
        `<button class="remove-room-button ml-auto text-sm text-red-600 hover:text-red-800 font-medium">&times; Remove</button>` : 
        `<div class="w-[84px]"></div>`; 
    
    return `
        <div class="room-row flex items-center gap-3 p-2 border-b border-gray-200" data-room-name="${roomName}">
            <label class="room-name-label font-medium text-gray-700 w-24 shrink-0">${roomName}:</label>
            <input type="number" class="room-capacity-input block w-20 p-2 border border-gray-300 rounded-md shadow-sm text-sm" value="${capacity}" min="1" placeholder="30">
            <input type="text" class="room-location-input block flex-grow p-2 border border-gray-300 rounded-md shadow-sm text-sm" value="${location}" placeholder="e.g., Commerce Block">
            ${removeButtonHtml}
        </div>
    `;
}
