---
name: gapnarrator-audio-description
description: Build and review timed audio-description workflows for video accessibility. Use this when creating narration that must fit silent gaps between dialogue.
---

# GapNarrator Audio Description Skill

## Purpose

Help Codex build features for timed audio-description production.

Audio description is not just describing what is visible. The hard problem is timing:
- What visual event matters?
- When is it revealed?
- Where is the nearest safe silent gap?
- How short must the narration be?
- Does it overlap dialogue?
- Does it spoil information early?

## Rules for Narration

Good audio-description lines are:
- short
- objective
- timed after the visual event
- free of unnecessary adjectives
- clear without interpretation
- short enough to fit the gap

Bad lines:
- too long
- cover dialogue
- explain emotions not visible
- reveal a plot point before the viewer should know it
- describe irrelevant visual details

## Example

Visual event:
"A detective steps to the desk phone."

Available gap:
1.4 seconds

Bad:
"The detective steps away from the suspect and lifts the desk phone to make the call."

Good:
"He picks up the phone."

## Build Checks

When implementing GapNarrator, verify:
1. Timeline gaps are computed correctly.
2. Narration duration is estimated.
3. Candidate narration fits the selected gap.
4. Narration does not overlap dialogue.
5. The UI clearly shows before/after.
6. The product is not described as an image analyzer.
