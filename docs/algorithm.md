# Algorithm Notes — Smart Timetable System

## Problem

The timetable scheduling problem is modelled as a **Graph Coloring** problem.

- Each class session (subject × batch × lecture number) is a **node**
- Two sessions have an **edge** between them if they conflict, i.e., they share a teacher, room, or batch
- Each **color** represents a time slot (day + period)
- The goal is to assign colors such that no two adjacent nodes share the same color

## Session Generation

For each subject and each batch, we create `lectures_per_week` sessions. Each session also gets a room assigned using a simple first-fit strategy (smallest room that fits the batch size).

## DSATUR Algorithm

DSATUR (Degree of Saturation) is the main scheduling algorithm.

The "saturation" of a vertex is how many different colors are already used by its neighbors.

At each step:
1. Pick the uncolored vertex with the highest saturation
2. If there's a tie, pick the one with more edges (neighbors)
3. Assign the smallest color not used by any of its neighbors

This greedy approach tends to produce good results for scheduling graphs because it naturally handles the most constrained sessions first.

**Complexity:** O(V²) — fast enough for the typical problem size (< 256 sessions)

```
function DSATUR(graph):
    while there are uncolored nodes:
        pick node v with highest saturation
        assign smallest color c not used by v's neighbors
        color[v] = c
```

## Backtracking Fallback

If DSATUR assigns more colors than the available time slots, backtracking is used to try to fit everything within the limit.

It works by trying each color for each node recursively and undoing choices that lead to conflicts.

Worst case is exponential, but in practice it's rarely needed because DSATUR usually does a good job.

## Conflict Validation

After scheduling, we check every pair of sessions that share the same time slot:
- If two sessions have the same teacher → teacher conflict
- If two sessions use the same room → room conflict
- If two sessions are for the same batch → batch conflict

A valid timetable has zero conflicts.

## Files (C Backend)

| File | What it does |
|------|-------------|
| `graph.c/h` | Adjacency matrix and graph building |
| `scheduler.c/h` | DSATUR coloring and backtracking |
| `parser.c/h` | JSON input parsing |
| `main.c` | Main program, reads input, runs scheduler, outputs JSON |

### Build

```bash
cd backend
gcc -Wall -o scheduler main.c graph.c scheduler.c parser.c
./scheduler ../data/sample_data.json
```

