# Makefile — Smart Timetable System — C Backend
#
# Usage:
#   make          – build the scheduler binary
#   make run      – build and run with sample data (must be run from backend/)
#   make clean    – remove build artifacts

CC      = gcc
CFLAGS  = -Wall -Wextra -std=c99
TARGET  = scheduler
SRCS    = main.c graph.c scheduler.c parser.c

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRCS)

run: $(TARGET)
	./$(TARGET) ../data/sample_data.json

clean:
	rm -f $(TARGET)
