#include "graph.h"
#include <stdio.h>
#include <string.h>

/*
 * buildConflictGraph
 * Adds an edge between two sessions if they share a teacher, batch, or room.
 */
void buildConflictGraph(Graph *g)
{
    int i, j;
    memset(g->adj, 0, sizeof(g->adj));
    /* g->V is already set by the caller */

    for (i = 0; i < g->V; i++) {
        for (j = i + 1; j < g->V; j++) {
            Session *si = &g->sessions[i];
            Session *sj = &g->sessions[j];

            int conflict = 0;

            /* teacher conflict */
            if (si->teacher_id == sj->teacher_id)
                conflict = 1;

            /* batch conflict */
            if (si->batch_id == sj->batch_id)
                conflict = 1;

            /* room conflict */
            if (si->room_id == sj->room_id)
                conflict = 1;

            if (conflict) {
                g->adj[i][j] = 1;
                g->adj[j][i] = 1;
            }
        }
    }
}

/*
 * printGraph – debug helper
 */
void printGraph(const Graph *g)
{
    int i, j;
    printf("Conflict Graph (%d nodes):\n", g->V);
    for (i = 0; i < g->V; i++) {
        printf("  Node %d (teacher=%d batch=%d room=%d) -> ",
               i,
               g->sessions[i].teacher_id,
               g->sessions[i].batch_id,
               g->sessions[i].room_id);
        for (j = 0; j < g->V; j++) {
            if (g->adj[i][j])
                printf("%d ", j);
        }
        printf("\n");
    }
}
