# Algorithm Documentation — Smart Timetable Management System

## 1. Problem Modelling: Graph Coloring

Academic timetable scheduling is modelled as a **Graph Coloring Problem**.

```
G = (V, E)
```

| Component | Meaning |
|-----------|---------|
| **V** | Set of class sessions (one node per required lecture) |
| **E** | Set of conflict edges between sessions |
| **Color** | A time slot (day + period combination) |

### Conflict Conditions

An edge `(u, v) ∈ E` is added between sessions `u` and `v` if any of the following hold:

| Conflict Type | Condition |
|---------------|-----------|
| Teacher conflict | `teacher_u == teacher_v` |
| Batch conflict   | `batch_u == batch_v`   |
| Room conflict    | `room_u == room_v`     |

The **goal** is to assign colors (time slots) to all vertices such that no two adjacent vertices share the same color — i.e., a **proper coloring** of G.

---

## 2. Session Construction

Before building the graph, the system enumerates all sessions:

```
for each subject s:
    for each batch b:
        for l in range(s.lectures_per_week):
            create session(teacher=s.teacher_id, batch=b.batch_id,
                           room=assigned_room(b), subject=s.subject_id)
```

**Room Assignment:** Rooms are assigned to batches using a first-fit-decreasing strategy. Batches are sorted by descending student count; each batch gets the smallest available room with sufficient capacity.

---

## 3. DSATUR — Primary Algorithm

### Overview

**DSATUR** (Degree of SATURation) is a dynamic greedy graph coloring algorithm. It consistently outperforms static Welsh-Powell ordering for structured scheduling graphs.

### Definition

The **saturation** of a vertex `v` is the number of *distinct colors* already present in its neighbourhood:

```
sat(v) = |{color(u) : u ∈ N(v), color(u) ≠ -1}|
```

### Algorithm (Pseudocode)

```
function DSATUR(G):
    for all v in V: color[v] = UNASSIGNED
    colored = 0

    while colored < |V|:
        best = argmax_{v uncolored} sat(v)
              (tie-break: max degree)

        usedColors = { color[u] : u ∈ N(best), color[u] ≠ UNASSIGNED }
        c = min non-negative integer ∉ usedColors
        color[best] = c
        colored++

    return color
```

### Complexity

| Operation | Cost |
|-----------|------|
| Select vertex | O(V) per iteration |
| Recompute saturation | O(V·E) amortised |
| **Total** | **O(V²)** |

For the typical problem size (V ≤ 256 sessions), this is negligible.

### Why DSATUR?

- **Better coloring quality** than static degree-sorted greedy: it adapts to the *actual* colors already assigned.
- For scheduling conflict graphs (which are perfect or near-perfect), DSATUR often achieves the chromatic number χ(G).
- No need for integer programming or constraint solvers.

---

## 4. Backtracking Scheduler (Fallback)

When DSATUR assigns more colors than the available time slots, a backtracking pass is applied to the overflow sessions.

### Algorithm (Pseudocode)

```
function BACKTRACK(sessions, adj, idx, maxColors):
    if idx == |sessions|: return SUCCESS
    if sessions[idx].color != UNASSIGNED:
        return BACKTRACK(sessions, adj, idx+1, maxColors)

    for c in 0..maxColors-1:
        if isSafe(sessions, adj, idx, c):
            sessions[idx].color = c
            if BACKTRACK(sessions, adj, idx+1, maxColors):
                return SUCCESS
            sessions[idx].color = UNASSIGNED   // backtrack

    return FAILURE
```

### Safety Check

```
function isSafe(sessions, adj, idx, color):
    for each neighbor j in adj[idx]:
        if sessions[j].color == color: return false
    return true
```

### Complexity

- **Worst case:** O(k^n) where k = number of colors, n = number of sessions
- **Practical:** Typically fast on scheduling instances because DSATUR pre-assigns most sessions correctly

---

## 5. Conflict Detection

After scheduling, the system validates the resulting timetable by checking every pair of entries sharing the same (day, slot):

```
for each pair (a, b) with same day and slot:
    if a.teacher == b.teacher → CONFLICT
    if a.room    == b.room    → CONFLICT
    if a.batch   == b.batch   → CONFLICT
```

A valid timetable has **zero conflicts** of all types.

---

## 6. Constraints Enforced

| Constraint | Enforcement Mechanism |
|------------|----------------------|
| Teacher uniqueness | Teacher-conflict edges in graph |
| Room uniqueness | Room-conflict edges in graph |
| Batch uniqueness | Batch-conflict edges in graph |
| Room capacity ≥ batch size | First-fit room assignment |
| Lectures per week met | Session generation (one node per lecture) |

---

## 7. Theoretical Background

### Graph Coloring and NP-Completeness

General graph coloring is **NP-complete** (Karp, 1972). For timetabling graphs however:

1. The conflict graph is typically **sparse** relative to its size (few cross-department conflicts).
2. Perfect graphs allow polynomial coloring — many timetabling graphs are near-perfect.
3. DSATUR achieves χ(G) on many structured inputs.

### Chromatic Number Lower Bound

```
χ(G) ≥ ω(G)
```

where `ω(G)` is the **clique number** (size of the largest complete subgraph). In timetabling, the largest clique is typically the number of sessions in the largest batch (all sessions of a single batch are pairwise conflicting).

---

## 8. Backend C Implementation

The C backend (in `/backend/`) implements the same algorithms:

| File | Responsibility |
|------|---------------|
| `graph.h / graph.c` | Adjacency matrix, graph construction |
| `scheduler.h / scheduler.c` | DSATUR coloring, isSafe, backtracking |
| `parser.c / parser.h` | JSON input parsing |
| `main.c` | Entry point, orchestration, JSON output |

### Build & Run

```bash
cd backend
gcc -Wall -Wextra -o scheduler main.c graph.c scheduler.c parser.c
./scheduler ../data/sample_data.json
```

The output is a JSON timetable matching the frontend's expected format.

---

## 9. Scheduling Process Summary

```
1. Parse input JSON
        ↓
2. Enumerate sessions (V = ∑ batches × lectures_per_week per subject)
        ↓
3. Assign rooms (First-Fit Decreasing by student count)
        ↓
4. Build conflict graph G = (V, E)
        ↓
5. Run DSATUR coloring (primary)
        ↓
6. If overflow: run backtracking on remaining sessions
        ↓
7. Map colors → (day, slot) pairs
        ↓
8. Output JSON timetable
        ↓
9. Validate: check zero conflicts
```
