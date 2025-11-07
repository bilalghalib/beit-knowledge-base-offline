#!/usr/bin/env python3
"""
Export curriculum DB to RAG-friendly JSON format.

Each activity becomes a searchable chunk with:
- Module, day, session context
- Activity name & purpose
- Facilitator script
- Associated homework
"""

import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "process" / "curriculum.db"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "curriculum_content.json"


def export_curriculum():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query to get all activities with day context
    query = """
    SELECT
        a.id as activity_id,
        d.module,
        d.day_number,
        d.theme as day_theme,
        a.name as activity_name,
        a.sequence_order,
        a.purpose,
        a.duration,
        a.facilitator_script,
        a.transition_script,
        lb.focus as learning_block_focus
    FROM activities a
    LEFT JOIN days d ON a.day_id = d.id
    LEFT JOIN learning_blocks lb ON a.block_id = lb.id
    WHERE d.module IS NOT NULL
    ORDER BY d.module, d.day_number, a.sequence_order
    """

    cursor.execute(query)
    activities = cursor.fetchall()

    # Get homework for each day
    homework_query = """
    SELECT
        d.id as day_id,
        d.module,
        d.day_number,
        ha.title as homework_title,
        GROUP_CONCAT(ht.task, ' | ') as homework_tasks
    FROM days d
    LEFT JOIN homework_assignments ha ON ha.day_id = d.id
    LEFT JOIN homework_tasks ht ON ht.assignment_id = ha.id
    WHERE d.module IS NOT NULL
    GROUP BY d.id, d.module, d.day_number, ha.title
    """

    cursor.execute(homework_query)
    homework_rows = cursor.fetchall()

    # Build homework lookup
    homework_by_day = {}
    for row in homework_rows:
        key = (row["module"], row["day_number"])
        if key not in homework_by_day:
            homework_by_day[key] = []
        if row["homework_title"]:
            homework_by_day[key].append({
                "title": row["homework_title"],
                "tasks": row["homework_tasks"] or ""
            })

    # Convert activities to RAG chunks
    chunks = []
    for idx, activity in enumerate(activities, 1):
        module = activity["module"]
        day = activity["day_number"]

        # Build searchable text chunk
        content_parts = [
            f"Module: {module}",
            f"Day {day}: {activity['day_theme']}",
            f"Session {activity['sequence_order']}: {activity['activity_name']}",
        ]

        if activity["learning_block_focus"]:
            content_parts.append(f"Learning Block Focus: {activity['learning_block_focus']}")

        if activity["purpose"]:
            content_parts.append(f"Purpose: {activity['purpose']}")

        if activity["duration"]:
            content_parts.append(f"Duration: {activity['duration']}")

        if activity["facilitator_script"]:
            content_parts.append(f"Facilitator Script: {activity['facilitator_script']}")

        if activity["transition_script"]:
            content_parts.append(f"Transition: {activity['transition_script']}")

        # Add homework if this is a late-session activity
        day_key = (module, day)
        if day_key in homework_by_day and activity["sequence_order"] >= 3:
            hw_items = homework_by_day[day_key]
            if hw_items:
                hw_text = "; ".join([
                    f"{hw['title']}: {hw['tasks']}" for hw in hw_items if hw['title']
                ])
                content_parts.append(f"Homework: {hw_text}")

        chunk = {
            "id": f"curr-{activity['activity_id']}",
            "content_type": "curriculum_activity",
            "module": module,
            "day": day,
            "day_theme": activity["day_theme"],
            "session_number": activity["sequence_order"],
            "activity_name": activity["activity_name"],
            "purpose": activity["purpose"],
            "duration": activity["duration"],
            "searchable_content": "\n".join(content_parts),
            "facilitator_script": activity["facilitator_script"],
            "transition_script": activity["transition_script"],
        }

        chunks.append(chunk)

    conn.close()

    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

    print(f"✅ Exported {len(chunks)} curriculum activities to {OUTPUT_PATH}")
    print(f"\nBreakdown:")
    for module in ["Architecture", "Solar", "Insulation"]:
        count = len([c for c in chunks if c["module"] == module])
        print(f"  {module}: {count} activities")


if __name__ == "__main__":
    export_curriculum()
