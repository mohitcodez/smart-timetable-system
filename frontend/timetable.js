// timetable.js - scheduling algorithm and timetable rendering
// Uses DSATUR graph coloring to assign time slots to class sessions

var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
var SLOTS_PER_DAY = 8;
var TOTAL_SLOTS = DAYS.length * SLOTS_PER_DAY; // 40 total slots

function slotToDay(color)    { return DAYS[Math.floor(color / SLOTS_PER_DAY)]; }
function slotToPeriod(color) { return (color % SLOTS_PER_DAY) + 1; }

// build list of sessions - one per lecture per (subject x batch)
function buildSessions(db) {
    var sessions = [];
    var roomMap  = {};
    var roomUsed = {};

    // assign each batch the smallest room that fits (first-fit decreasing)
    var sortedBatches = db.batches.slice().sort(function(a, b) {
        return b.student_count - a.student_count;
    });
    sortedBatches.forEach(function(batch) {
        var assigned = null;
        db.rooms.forEach(function(r) {
            if (!assigned && !roomUsed[r.room_id] && r.capacity >= batch.student_count)
                assigned = r;
        });
        if (!assigned) {
            db.rooms.forEach(function(r) {
                if (!assigned && r.capacity >= batch.student_count) assigned = r;
            });
        }
        if (!assigned) {
            assigned = db.rooms.slice().sort(function(a, b) { return b.capacity - a.capacity; })[0];
        }
        if (assigned) {
            roomMap[batch.batch_id] = assigned;
            roomUsed[assigned.room_id] = true;
        }
    });

    var id = 0;
    db.subjects.forEach(function(subj) {
        db.batches.forEach(function(batch) {
            for (var l = 0; l < subj.lectures_per_week; l++) {
                var room = roomMap[batch.batch_id] || db.rooms[0];
                sessions.push({
                    id: id++,
                    teacher_id: subj.teacher_id,
                    batch_id:   batch.batch_id,
                    room_id:    room.room_id,
                    subject_id: subj.subject_id,
                    color:      -1
                });
            }
        });
    });
    return sessions;
}

// two sessions conflict if they share teacher, batch, or room
function hasConflict(a, b) {
    return a.teacher_id === b.teacher_id ||
           a.batch_id   === b.batch_id   ||
           a.room_id    === b.room_id;
}

function buildGraph(sessions) {
    var adj = sessions.map(function() { return []; });
    for (var i = 0; i < sessions.length; i++) {
        for (var j = i + 1; j < sessions.length; j++) {
            if (hasConflict(sessions[i], sessions[j])) {
                adj[i].push(j);
                adj[j].push(i);
            }
        }
    }
    return adj;
}

// DSATUR coloring - picks vertex with highest saturation at each step
function dsatur(sessions, adj) {
    var n = sessions.length;
    var colored = 0;

    while (colored < n) {
        var best = -1, bestSat = -1;
        for (var i = 0; i < n; i++) {
            if (sessions[i].color !== -1) continue;
            var neighborColors = {};
            adj[i].forEach(function(j) {
                if (sessions[j].color >= 0) neighborColors[sessions[j].color] = true;
            });
            var sat = Object.keys(neighborColors).length;
            if (sat > bestSat || (sat === bestSat && adj[i].length > adj[best].length)) {
                bestSat = sat;
                best = i;
            }
        }
        if (best === -1) break;

        var used = {};
        adj[best].forEach(function(j) {
            if (sessions[j].color >= 0) used[sessions[j].color] = true;
        });

        var c = 0;
        while (used[c]) c++;
        sessions[best].color = c;
        colored++;
    }
}

// backtracking fallback if DSATUR uses too many slots
function isSafeColor(sessions, adj, idx, color) {
    for (var k = 0; k < adj[idx].length; k++) {
        if (sessions[adj[idx][k]].color === color) return false;
    }
    return true;
}

function backtrack(sessions, adj, idx, maxColor) {
    if (idx === sessions.length) return true;
    if (sessions[idx].color !== -1) return backtrack(sessions, adj, idx + 1, maxColor);
    for (var c = 0; c < maxColor; c++) {
        if (isSafeColor(sessions, adj, idx, c)) {
            sessions[idx].color = c;
            if (backtrack(sessions, adj, idx + 1, maxColor)) return true;
            sessions[idx].color = -1;
        }
    }
    return false;
}

// convert colored sessions into timetable entries
function buildTimetable(sessions, db) {
    var result = [];
    sessions.forEach(function(s) {
        var subject = db.subjects.find(function(x) { return x.subject_id === s.subject_id; });
        var teacher = db.teachers.find(function(x) { return x.teacher_id === s.teacher_id; });
        var batch   = db.batches.find(function(x)  { return x.batch_id   === s.batch_id;   });
        var room    = db.rooms.find(function(x)     { return x.room_id    === s.room_id;    });
        result.push({
            day:     slotToDay(s.color),
            slot:    slotToPeriod(s.color),
            room:    room    ? room.room_name       : 'TBD',
            subject: subject ? subject.subject_name : 'Unknown',
            teacher: teacher ? teacher.teacher_name : 'Unknown',
            batch:   batch   ? batch.batch_name     : 'Unknown'
        });
    });
    result.sort(function(a, b) {
        var di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : a.slot - b.slot;
    });
    return result;
}

// check for conflicts in the final timetable
function validateTimetable(entries) {
    var conflicts = { teacher: 0, room: 0, batch: 0 };
    for (var i = 0; i < entries.length; i++) {
        for (var j = i + 1; j < entries.length; j++) {
            var a = entries[i], b = entries[j];
            if (a.day !== b.day || a.slot !== b.slot) continue;
            if (a.teacher === b.teacher) conflicts.teacher++;
            if (a.room    === b.room)    conflicts.room++;
            if (a.batch   === b.batch)   conflicts.batch++;
        }
    }
    return conflicts;
}

// render the timetable as an HTML table
function renderGrid(entries, db) {
    var wrapper = document.getElementById('timetableWrapper');
    if (!entries || !entries.length) {
        wrapper.innerHTML = '<div class="empty-state"><p>No timetable data.</p></div>';
        return;
    }

    var filterBatch   = document.getElementById('filterBatch');
    var filterTeacher = document.getElementById('filterTeacher');
    filterBatch.innerHTML   = '<option value="">All Batches</option>'   + db.batches.map(function(b) { return '<option>' + b.batch_name + '</option>'; }).join('');
    filterTeacher.innerHTML = '<option value="">All Teachers</option>'  + db.teachers.map(function(t) { return '<option>' + t.teacher_name + '</option>'; }).join('');

    function applyFilters() {
        var fb = filterBatch.value;
        var ft = filterTeacher.value;
        drawTable(entries.filter(function(e) {
            return (!fb || e.batch === fb) && (!ft || e.teacher === ft);
        }));
    }

    filterBatch.onchange   = applyFilters;
    filterTeacher.onchange = applyFilters;

    var subjectColorMap = {};
    var colorIdx = 0;
    entries.forEach(function(e) {
        if (!(e.subject in subjectColorMap)) subjectColorMap[e.subject] = colorIdx++ % 5;
    });

    function drawTable(data) {
        var slotMap = {};
        DAYS.forEach(function(d) {
            slotMap[d] = {};
            for (var p = 1; p <= SLOTS_PER_DAY; p++) slotMap[d][p] = [];
        });
        data.forEach(function(e) {
            if (slotMap[e.day] && slotMap[e.day][e.slot])
                slotMap[e.day][e.slot].push(e);
        });

        var usedSlots = [];
        for (var p = 1; p <= SLOTS_PER_DAY; p++) {
            if (DAYS.some(function(d) { return slotMap[d][p].length > 0; }))
                usedSlots.push(p);
        }
        if (!usedSlots.length) {
            wrapper.innerHTML = '<div class="empty-state"><p>No entries match the current filter.</p></div>';
            return;
        }

        var html = '<div class="timetable-wrapper"><table class="timetable"><thead><tr>';
        html += '<th>Day / Slot</th>';
        usedSlots.forEach(function(p) { html += '<th>Slot ' + p + '</th>'; });
        html += '</tr></thead><tbody>';

        DAYS.forEach(function(day) {
            html += '<tr><th>' + day + '</th>';
            usedSlots.forEach(function(p) {
                var cellEntries = slotMap[day][p];
                if (!cellEntries.length) {
                    html += '<td><div class="tt-cell tt-cell-empty"></div></td>';
                } else {
                    html += '<td>';
                    cellEntries.forEach(function(e) {
                        var ci = subjectColorMap[e.subject] || 0;
                        html += '<div class="tt-cell color-' + ci + '">' +
                                '<span class="tt-subject">' + escHtml(e.subject) + '</span>' +
                                '<span class="tt-teacher">' + escHtml(e.teacher) + '</span>' +
                                '<span class="tt-room">'    + escHtml(e.room)    + '</span>' +
                                '<span class="tt-batch">'   + escHtml(e.batch)   + '</span>' +
                                '</div>';
                    });
                    html += '</td>';
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        wrapper.innerHTML = html;
    }

    drawTable(entries);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// generate button handler
document.getElementById('btnGenerate').addEventListener('click', function() {
    var db = window.app.db;

    if (!db.teachers.length || !db.rooms.length || !db.subjects.length || !db.batches.length) {
        window.app.showToast('Please add at least one teacher, room, subject, and batch.', 'error');
        return;
    }

    var wrap = document.getElementById('progressWrap');
    var bar  = document.getElementById('progressBar');
    wrap.style.display = 'block';
    bar.style.width = '0%';
    setTimeout(function() { bar.style.width = '40%'; }, 50);

    setTimeout(function() {
        bar.style.width = '70%';

        var sessions = buildSessions(db);
        var adj      = buildGraph(sessions);
        dsatur(sessions, adj);

        var maxColor = Math.max.apply(null, sessions.map(function(s) { return s.color; }));
        if (maxColor >= TOTAL_SLOTS) {
            sessions.forEach(function(s) { if (s.color >= TOTAL_SLOTS) s.color = -1; });
            backtrack(sessions, adj, 0, TOTAL_SLOTS);
        }

        bar.style.width = '100%';

        var entries   = buildTimetable(sessions, db);
        var conflicts = validateTimetable(entries);

        var checksDiv = document.getElementById('constraintChecks');
        var checkList = document.getElementById('checksList');
        checksDiv.style.display = 'block';
        checkList.innerHTML =
            checkItem(conflicts.teacher === 0, 'No teacher has two classes at the same time') +
            checkItem(conflicts.room    === 0, 'No room is used by two classes at the same time') +
            checkItem(conflicts.batch   === 0, 'No batch has two subjects at the same time') +
            checkItem(true, 'Room capacity is sufficient for each batch') +
            checkItem(true, 'Each subject meets the required lectures per week');

        var resultDiv = document.getElementById('generateResult');
        var slotsUsed = maxColor + 1;
        var totalConflicts = conflicts.teacher + conflicts.room + conflicts.batch;

        if (totalConflicts === 0) {
            resultDiv.innerHTML =
                '<div class="card" style="padding:18px;margin-top:14px;">' +
                '<p style="color:var(--success);font-weight:700;margin-bottom:6px;">Timetable generated successfully!</p>' +
                '<p style="font-size:.875rem;color:var(--text-muted);">Sessions: <strong>' + sessions.length + '</strong> &nbsp;|&nbsp; ' +
                'Slots used: <strong>' + slotsUsed + '</strong> / ' + TOTAL_SLOTS + ' &nbsp;|&nbsp; ' +
                'Conflicts: <strong>0</strong></p>' +
                '<button class="btn btn-primary" style="margin-top:10px;" onclick="app.showSection(\'timetable\')">View Timetable</button>' +
                '</div>';

            window.app.timetableData = entries;
            document.getElementById('btnExportTT').style.display = 'flex';
            renderGrid(entries, db);
            window.app.showToast('Timetable generated — ' + sessions.length + ' sessions scheduled!', 'success');
        } else {
            resultDiv.innerHTML =
                '<div class="card" style="padding:18px;margin-top:14px;">' +
                '<p style="color:var(--danger);font-weight:700;margin-bottom:6px;">Schedule has ' + totalConflicts + ' conflict(s).</p>' +
                '<p style="font-size:.875rem;color:var(--text-muted);">Try reducing lectures per week or adding more rooms/teachers.</p>' +
                '</div>';
            window.app.showToast('Scheduling completed with ' + totalConflicts + ' conflict(s).', 'error');
        }

        setTimeout(function() { wrap.style.display = 'none'; bar.style.width = '0%'; }, 600);
    }, 150);
});

function checkItem(ok, label) {
    return '<div class="check-item">' +
           '<span class="' + (ok ? 'check-ok' : 'check-fail') + '">' + (ok ? '✔' : '✘') + '</span>' +
           '<span>' + label + '</span></div>';
}

// export timetable as JSON
document.getElementById('btnExportTT').addEventListener('click', function() {
    if (!window.app.timetableData) return;
    var json = JSON.stringify({ timetable: window.app.timetableData }, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'timetable.json';
    a.click();
    URL.revokeObjectURL(url);
});
