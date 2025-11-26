// remuneration.js

// --- 1. DEFAULT RATE CARDS ---
const DEFAULT_RATES = {
    "Regular": {
        // Supervision
        chief_supdt: 113, senior_supdt: 105, office_supdt: 90,
        // Execution
        invigilator: 90, invigilator_ratio: 30, invigilator_min_fraction: 0, scribe_invigilator_ratio: 1,
        // Support
        clerk_full_slab: 113, clerk_slab_1: 38, clerk_slab_2: 75,
        sweeper_rate: 25, sweeper_min: 35,
        peon_rate: 0, 
        // Fixed
        data_entry_operator: 890, accountant: 1000, contingent_charge: 0.40,
        // Flags
        has_peon: false, has_double_session_rates: false
    },
    "Other": {
        // SDE Rates
        chief_supdt_single: 500, chief_supdt_double: 800,
        senior_supdt_single: 400, senior_supdt_double: 700,
        office_supdt: 0, 

        invigilator: 350, 
        invigilator_ratio: 30, invigilator_min_fraction: 5, scribe_invigilator_ratio: 1,

        clerk_single: 300, clerk_double: 500, clerk_ratio: 500,
        peon_single: 250, peon_double: 400, peon_ratio: 500,
        sweeper_single: 225, sweeper_double: 350, sweeper_ratio: 100,

        data_entry_operator: 0, accountant: 0, contingent_charge: 2.00,

        has_peon: true, has_double_session_rates: true
    }
};

const REMUNERATION_CONFIG_KEY = 'examRemunerationConfig';
let allRates = {};
let isRatesLocked = true;

// --- 2. INITIALIZATION ---
function initRemunerationModule() {
    loadRates();
    renderRateConfigForm();
}

function loadRates() {
    const saved = localStorage.getItem(REMUNERATION_CONFIG_KEY);
    if (saved) {
        allRates = JSON.parse(saved);
        if (!allRates["Other"] || !allRates["Other"].chief_supdt_double) {
            allRates["Other"] = JSON.parse(JSON.stringify(DEFAULT_RATES["Other"]));
        }
    } else {
        allRates = JSON.parse(JSON.stringify(DEFAULT_RATES));
        localStorage.setItem(REMUNERATION_CONFIG_KEY, JSON.stringify(allRates));
    }
}

// --- 3. UI: RATE SETTINGS FORM ---
function renderRateConfigForm() {
    const container = document.getElementById('rate-config-container');
    const selector = document.getElementById('rate-stream-selector');
    if (!container || !selector) return;
    
    const currentStream = selector.value || "Regular";
    const rates = allRates[currentStream];
    const disabledAttr = isRatesLocked ? 'disabled' : '';
    const bgClass = isRatesLocked ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900 border-blue-400 ring-1 ring-blue-200';

    if (currentStream === "Regular") {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-blue-600 uppercase border-b pb-1">Supervision (Per Session)</h4>
                    ${createRateInput('Chief Supdt', 'chief_supdt', rates.chief_supdt, disabledAttr, bgClass)}
                    ${createRateInput('Senior Supdt', 'senior_supdt', rates.senior_supdt, disabledAttr, bgClass)}
                    ${createRateInput('Office Supdt', 'office_supdt', rates.office_supdt, disabledAttr, bgClass)}
                </div>
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-blue-600 uppercase border-b pb-1">Duty Staff</h4>
                    ${createRateInput('Invigilator', 'invigilator', rates.invigilator, disabledAttr, bgClass)}
                    ${createRateInput('Invig Ratio', 'invigilator_ratio', rates.invigilator_ratio, disabledAttr, bgClass)}
                    ${createRateInput('Clerk (Full)', 'clerk_full_slab', rates.clerk_full_slab, disabledAttr, bgClass)}
                    <div class="grid grid-cols-2 gap-2">
                        ${createRateInput('Clerk <30', 'clerk_slab_1', rates.clerk_slab_1, disabledAttr, bgClass)}
                        ${createRateInput('Clerk <60', 'clerk_slab_2', rates.clerk_slab_2, disabledAttr, bgClass)}
                    </div>
                    ${createRateInput('Sweeper Rate', 'sweeper_rate', rates.sweeper_rate, disabledAttr, bgClass)}
                </div>
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-blue-600 uppercase border-b pb-1">Fixed / Allowances</h4>
                    ${createRateInput('Data Entry', 'data_entry_operator', rates.data_entry_operator, disabledAttr, bgClass)}
                    ${createRateInput('Accountant', 'accountant', rates.accountant, disabledAttr, bgClass)}
                    ${createRateInput('Contingency', 'contingent_charge', rates.contingent_charge, disabledAttr, bgClass)}
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-orange-600 uppercase border-b pb-1">Supervision (Single / Double)</h4>
                    <div class="grid grid-cols-2 gap-2">
                        ${createRateInput('Chief (1)', 'chief_supdt_single', rates.chief_supdt_single, disabledAttr, bgClass)}
                        ${createRateInput('Chief (2)', 'chief_supdt_double', rates.chief_supdt_double, disabledAttr, bgClass)}
                        ${createRateInput('Senior (1)', 'senior_supdt_single', rates.senior_supdt_single, disabledAttr, bgClass)}
                        ${createRateInput('Senior (2)', 'senior_supdt_double', rates.senior_supdt_double, disabledAttr, bgClass)}
                    </div>
                </div>
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-orange-600 uppercase border-b pb-1">Duty Staff (Single / Double)</h4>
                    ${createRateInput('Invigilator (Session)', 'invigilator', rates.invigilator, disabledAttr, bgClass)}
                    <div class="grid grid-cols-2 gap-2">
                        ${createRateInput('Clerk (1)', 'clerk_single', rates.clerk_single, disabledAttr, bgClass)}
                        ${createRateInput('Clerk (2)', 'clerk_double', rates.clerk_double, disabledAttr, bgClass)}
                        ${createRateInput('Peon (1)', 'peon_single', rates.peon_single, disabledAttr, bgClass)}
                        ${createRateInput('Peon (2)', 'peon_double', rates.peon_double, disabledAttr, bgClass)}
                        ${createRateInput('Swpr (1)', 'sweeper_single', rates.sweeper_single, disabledAttr, bgClass)}
                        ${createRateInput('Swpr (2)', 'sweeper_double', rates.sweeper_double, disabledAttr, bgClass)}
                    </div>
                </div>
                <div class="space-y-3">
                    <h4 class="font-semibold text-xs text-orange-600 uppercase border-b pb-1">Ratios & Allowances</h4>
                    ${createRateInput('Invig Ratio', 'invigilator_ratio', rates.invigilator_ratio, disabledAttr, bgClass)}
                    ${createRateInput('Clerk/Peon Ratio', 'clerk_ratio', rates.clerk_ratio, disabledAttr, bgClass)}
                    ${createRateInput('Contingency', 'contingent_charge', rates.contingent_charge, disabledAttr, bgClass)}
                </div>
            </div>
        `;
    }

    if (!isRatesLocked) {
        container.querySelectorAll('.rate-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                allRates[currentStream][key] = parseFloat(e.target.value);
            });
        });
    }
    updateLockBtn();
}

function createRateInput(label, key, value, disabled, bgClass) {
    return `
        <div class="flex justify-between items-center">
            <label class="text-[10px] uppercase text-gray-600 font-semibold">${label}</label>
            <input type="number" data-key="${key}" value="${value}" ${disabled} 
                   class="rate-input w-14 text-right p-1 border rounded text-xs ${bgClass}">
        </div>
    `;
}

function updateLockBtn() {
    const lockBtn = document.getElementById('toggle-rate-lock');
    if(lockBtn) {
        lockBtn.innerHTML = isRatesLocked 
            ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Edit Rates` 
            : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Save Changes`;
        
        lockBtn.className = isRatesLocked 
            ? "text-xs flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-300 px-3 py-1 rounded hover:bg-gray-200 transition"
            : "text-xs flex items-center gap-1 bg-green-50 text-green-700 border border-green-300 px-3 py-1 rounded hover:bg-green-100 transition animate-pulse";
    }
}

window.toggleRemunerationLock = function() {
    if (!isRatesLocked) {
        localStorage.setItem(REMUNERATION_CONFIG_KEY, JSON.stringify(allRates));
        if(typeof syncDataToCloud === 'function') syncDataToCloud();
    }
    isRatesLocked = !isRatesLocked;
    renderRateConfigForm();
};

// --- 4. CORE ENGINE: CALCULATE BILL ---
function generateBillForSessions(billTitle, sessionData, streamType) {
    if (Object.keys(allRates).length === 0) loadRates();
    
    const rates = allRates[streamType] || allRates["Regular"];
    if (!rates) return null;

    let bill = {
        title: billTitle,
        stream: streamType,
        supervision: 0, invigilation: 0, clerical: 0, sweeping: 0, peon: 0,
        supervision_breakdown: { chief: {total:0}, senior: {total:0}, office: {total:0} },
        details: [],
        has_peon: rates.has_peon
    };

    // --- LOGIC FOR OTHER (SDE) STREAMS ---
    if (streamType !== "Regular") {
        const sessionsByDate = {};
        sessionData.forEach(s => {
            const dateKey = s.date;
            if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = [];
            sessionsByDate[dateKey].push(s);
        });

        Object.keys(sessionsByDate).sort().forEach(date => {
            const dailySessions = sessionsByDate[date];
            const isDouble = dailySessions.length > 1;
            
            dailySessions.forEach(session => {
                const count = session.normalCount + session.scribeCount;
                
                // A. Supervision (Daily Rate Split)
                const chiefRate = isDouble ? rates.chief_supdt_double : rates.chief_supdt_single;
                const seniorRate = isDouble ? rates.senior_supdt_double : rates.senior_supdt_single;
                const chiefCost = chiefRate / dailySessions.length;
                const seniorCost = seniorRate / dailySessions.length;
                
                bill.supervision_breakdown.chief.total += chiefCost;
                bill.supervision_breakdown.senior.total += seniorCost;
                const supTotal = chiefCost + seniorCost;

                // B. Invigilators (Updated: Correctly Split Normal vs Scribe)
                let normalInvigs = 0;
                if (count > 0) {
                    normalInvigs = Math.floor(count / rates.invigilator_ratio);
                    if ((count % rates.invigilator_ratio) > rates.invigilator_min_fraction) normalInvigs++;
                    if (normalInvigs === 0) normalInvigs = 1;
                }
                
                let scribeInvigs = 0;
                if (session.scribeCount > 0) {
                    scribeInvigs = Math.ceil(session.scribeCount / rates.scribe_invigilator_ratio);
                }
                
                const totalInvigs = normalInvigs + scribeInvigs;
                const invigCost = totalInvigs * rates.invigilator;

                // C. Support Staff (Daily Rate Split)
                const staffCount = Math.ceil(count / rates.clerk_ratio);
                
                const clerkRate = isDouble ? rates.clerk_double : rates.clerk_single;
                const peonRate = isDouble ? rates.peon_double : rates.peon_single;
                const sweeperRate = isDouble ? rates.sweeper_double : rates.sweeper_single;

                const clerkCost = (clerkRate / dailySessions.length) * staffCount;
                const peonCost = (peonRate / dailySessions.length) * staffCount;
                const sweeperCost = (sweeperRate / dailySessions.length) * staffCount;

                bill.supervision += supTotal;
                bill.invigilation += invigCost;
                bill.clerical += clerkCost;
                bill.peon += peonCost;
                bill.sweeping += sweeperCost;

                bill.details.push({
                    date: session.date,
                    time: session.time,
                    total_students: count,
                    scribe_students: session.scribeCount,
                    // FIX: Explicitly set these for the UI
                    invig_count_normal: normalInvigs,
                    invig_count_scribe: scribeInvigs,
                    invig_cost: invigCost,
                    clerk_cost: clerkCost,
                    peon_cost: peonCost,
                    sweeper_cost: sweeperCost,
                    cs_cost: chiefCost,
                    sas_cost: seniorCost,
                    os_cost: 0,
                    supervision_cost: supTotal
                });
            });
        });
    } 
    // --- LOGIC FOR REGULAR STREAM ---
    else {
        sessionData.forEach(session => {
            const normalStudents = session.normalCount || 0;
            const scribeStudents = session.scribeCount || 0;
            const totalStudents = normalStudents + scribeStudents;
            
            let normalInvigs = 0;
            if (totalStudents > 0) {
                normalInvigs = Math.floor(totalStudents / rates.invigilator_ratio);
                if ((totalStudents % rates.invigilator_ratio) > rates.invigilator_min_fraction) normalInvigs++;
                if (normalInvigs === 0) normalInvigs = 1; 
            }
            let scribeInvigs = 0;
            if (scribeStudents > 0) scribeInvigs = Math.ceil(scribeStudents / rates.scribe_invigilator_ratio);
            
            const totalInvigs = normalInvigs + scribeInvigs;
            const invigCost = totalInvigs * rates.invigilator;

            let clerkCost = 0;
            const clerkFullBatches = Math.floor(totalStudents / 100);
            const clerkRemainder = totalStudents % 100;
            clerkCost += clerkFullBatches * rates.clerk_full_slab;
            if (clerkRemainder > 0) {
                if (clerkRemainder <= 30) clerkCost += rates.clerk_slab_1;
                else if (clerkRemainder <= 60) clerkCost += rates.clerk_slab_2;
                else clerkCost += rates.clerk_full_slab;
            }

            let sweeperCost = Math.ceil(totalStudents / 100) * rates.sweeper_rate;
            if (sweeperCost < rates.sweeper_min) sweeperCost = rates.sweeper_min;

            const supervisionCost = rates.chief_supdt + rates.senior_supdt + rates.office_supdt;

            bill.supervision_breakdown.chief.total += rates.chief_supdt;
            bill.supervision_breakdown.senior.total += rates.senior_supdt;
            bill.supervision_breakdown.office.total += rates.office_supdt;

            bill.supervision += supervisionCost;
            bill.invigilation += invigCost;
            bill.clerical += clerkCost;
            bill.sweeping += sweeperCost;

            bill.details.push({
                date: session.date,
                time: session.time,
                total_students: totalStudents,
                scribe_students: scribeStudents,
                invig_count_normal: normalInvigs,
                invig_count_scribe: scribeInvigs,
                invig_cost: invigCost,
                clerk_cost: clerkCost,
                peon_cost: 0,
                sweeper_cost: sweeperCost,
                cs_cost: rates.chief_supdt,
                sas_cost: rates.senior_supdt,
                os_cost: rates.office_supdt,
                supervision_cost: supervisionCost
            });
        });
    }

    const totalRegistered = sessionData.reduce((sum, s) => sum + (s.normalCount + s.scribeCount), 0);
    bill.contingency = totalRegistered * rates.contingent_charge;
    bill.data_entry = rates.data_entry_operator || 0;
    
    bill.grand_total = bill.supervision + bill.invigilation + bill.clerical + bill.sweeping + bill.peon + bill.contingency + bill.data_entry;
    
    return bill;
}

window.initRemunerationModule = initRemunerationModule;
window.renderRateConfigForm = renderRateConfigForm;
window.generateBillForSessions = generateBillForSessions;

loadRates();
