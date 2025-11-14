import { allStudentData, allStudentSessions, currentRoomConfig, qpCodeMap, ROOM_ALLOTMENT_KEY, SCRIBE_ALLOTMENT_KEY } from './state.js';
import { performOriginalAllocation } from './allocation.js';
import { cleanCourseKey } from './utils.js';

// --- Get references to all Search elements ---
const navSearch = document.getElementById('nav-search');
const viewSearch = document.getElementById('view-search');
const searchLoader = document.getElementById('search-loader');
const searchContentWrapper = document.getElementById('search-content-wrapper');
const sessionSelectSearch = document.getElementById('session-select-search');
const studentSearchSection = document.getElementById('student-search-section');
const searchInputStudent = document.getElementById('search-input-student');
const searchAutocompleteResults = document.getElementById('search-autocomplete-results');
const searchStudentDetails = document.getElementById('search-student-details');

// --- Functions ---

export function disable_search_tab(disabled) {
    navSearch.disabled = disabled;
    if (disabled) {
        searchLoader.classList.remove('hidden');
        searchContentWrapper.classList.add('hidden');
        navSearch.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        searchLoader.classList.add('hidden');
        searchContentWrapper.classList.remove('hidden');
        navSearch.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

export function populate_search_session_dropdown() {
    try {
        if (allStudentSessions.length === 0) {
            disable_search_tab(true);
            return;
        }
        
        sessionSelectSearch.innerHTML = '<option value="">-- Select a Session --</option>'; // Clear
        
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB').replace(/\//g, '.'); // DD.MM.YYYY
        let defaultSession = "";
        
        allStudentSessions.forEach(session => {
            sessionSelectSearch.innerHTML += `<option value="${session}">${session}</option>`;
            if (session.startsWith(todayStr)) {
                defaultSession = session;
            }
        });
        
        if (defaultSession) {
            sessionSelectSearch.value = defaultSession;
            sessionSelectSearch.dispatchEvent(new Event('change')); // Trigger change
        }

    } catch (e) {
        console.error("Failed to populate search sessions:", e);
        disable_search_tab(true);
    }
}

function displayStudentDetails(student) {
    const sessionKey = sessionSelectSearch.value;
    const [date, time] = sessionKey.split(' | ');
    const regNo = student['Register Number'];

    const studentCourses = allStudentData.filter(s => 
        s.Date === date && 
        s.Time === time && 
        s['Register Number'] === regNo
    );

    const sessionStudents = allStudentData.filter(s => s.Date === date && s.Time === time);
    const allocatedSessionData = performOriginalAllocation(sessionStudents);
    const allocatedStudent = allocatedSessionData.find(s => s['Register Number'] === regNo);

    let roomDisplay = '<span class="font-medium text-gray-700">Awaiting Allotment</span>';
    let seatDisplay = 'N/A';
    
    if (allocatedStudent) {
        let roomName = allocatedStudent['Room No'];
        let seatNo = allocatedStudent.seatNumber;
        
        if (allocatedStudent.isScribe) {
            const allScribeAllotments = JSON.parse(localStorage.getItem(SCRIBE_ALLOTMENT_KEY) || '{}');
            const sessionScribeAllotment = allScribeAllotments[sessionKey] || {};
            roomName = sessionScribeAllotment[regNo] || 'Scribe Room (Not Allotted)';
            seatNo = 'N/A';
        }

        const roomInfo = currentRoomConfig[roomName];
        const location = (roomInfo && roomInfo.location) ? ` (${roomInfo.location})` : '';
        roomDisplay = `<span class="font-bold text-blue-600">${roomName}${location}</span>`;
        seatDisplay = seatNo;
    }

    const sessionQPCodes = qpCodeMap[sessionKey] || {};

    let coursesHtml = '';
    studentCourses.forEach(course => {
        const courseKey = cleanCourseKey(course.Course);
        const qpCode = sessionQPCodes[courseKey] || "N/A";
        coursesHtml += `
            <div class="border-t border-gray-200 pt-2 mt-2">
                <p class="text-sm"><strong class="text-gray-600">Course:</strong> ${course.Course}</p>
                <p class="text-sm"><strong class="text-gray-600">QP Code:</strong> ${qpCode}</p>
            </div>
        `;
    });

    searchStudentDetails.innerHTML = `
        <h4 class="text-lg font-bold text-gray-900">${student.Name}</h4>
        <p class="text-sm font-medium text-gray-500 mb-2">${regNo}</p>
        
        <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
                <p class="text-sm font-medium text-gray-500">Room</p>
                <p class="text-base">${roomDisplay}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Seat Number</p>
                <p class="text-base font-bold text-blue-600">${seatDisplay}</p>
            </div>
        </div>
        ${coursesHtml}
    `;
    searchStudentDetails.classList.remove('hidden');
}

function selectStudentForSearch(student) {
    searchInputStudent.value = student['Register Number'];
    searchAutocompleteResults.classList.add('hidden');
    displayStudentDetails(student);
}

// --- Init Function ---

export function initSearchTab() {
    sessionSelectSearch.addEventListener('change', () => {
        const sessionKey = sessionSelectSearch.value;
        if (sessionKey) {
            studentSearchSection.classList.remove('hidden');
        } else {
            studentSearchSection.classList.add('hidden');
        }
        searchInputStudent.value = '';
        searchAutocompleteResults.innerHTML = '';
        searchAutocompleteResults.classList.add('hidden');
        searchStudentDetails.innerHTML = '';
        searchStudentDetails.classList.add('hidden');
    });

    searchInputStudent.addEventListener('input', () => {
        const query = searchInputStudent.value.trim().toUpperCase();
        searchAutocompleteResults.innerHTML = '';
        
        if (query.length < 3) {
            searchAutocompleteResults.classList.add('hidden');
            return;
        }
        
        const sessionKey = sessionSelectSearch.value;
        if (!sessionKey) return;
        const [date, time] = sessionKey.split(' | ');
        
        const sessionStudents = allStudentData.filter(s => s.Date === date && s.Time === time);
        
        const matches = sessionStudents.filter(s => s['Register Number'].toUpperCase().includes(query)).slice(0, 10);
        
        if (matches.length > 0) {
            matches.forEach(student => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = student['Register Number'].replace(new RegExp(query, 'gi'), '<strong>$&</strong>') + ` (${student.Name})`;
                item.onclick = () => selectStudentForSearch(student);
                searchAutocompleteResults.appendChild(item);
            });
            searchAutocompleteResults.classList.remove('hidden');
        } else {
            searchAutocompleteResults.classList.add('hidden');
        }
    });
}
