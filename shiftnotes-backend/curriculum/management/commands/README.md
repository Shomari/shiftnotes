# Competency Population Script

## Overview
The `populate_competencies.py` script is a Django management command that populates the database with core competencies and sub-competencies for a specific program. It reads milestone data from the hardcoded TypeScript file and creates the appropriate database records.

## Usage

### Basic Usage
```bash
python manage.py populate_competencies <program_id>
```

### Clear Existing Data
```bash
python manage.py populate_competencies <program_id> --clear-existing
```

## Parameters

- `program_id` (required): UUID of the program to populate competencies for
- `--clear-existing` (optional): Clear existing competencies for this program before populating

## What It Does

1. **Validates Program**: Checks that the program exists in the database
2. **Clears Data** (if `--clear-existing` flag is used): Removes existing competencies and sub-competencies for the program
3. **Creates Core Competencies**: Creates 6 core competency records (PC, MK, SBP, PBLI, PROF, ICS)
4. **Creates Sub-Competencies**: Creates 22 sub-competency records with 5 milestone levels each
5. **Populates Milestone Levels**: Converts the milestone descriptions from the TypeScript data into text fields

## Database Schema

### Core Competency Table
- `id`: UUID (primary key)
- `program_id`: UUID (foreign key to programs table)
- `code`: String (e.g., "PC")
- `title`: String (e.g., "Patient Care")

### Sub Competency Table
- `id`: UUID (primary key)
- `program_id`: UUID (foreign key to programs table)
- `core_id`: UUID (foreign key to core_competencies table)
- `code`: String (e.g., "PC1")
- `title`: String (e.g., "Emergency Stabilization")
- `milestone_level_1` through `milestone_level_5`: Text fields containing milestone descriptions

## Example

```bash
# Get a program ID
python manage.py shell -c "from organizations.models import Program; print(Program.objects.first().id)"

# Populate competencies for that program
python manage.py populate_competencies 6f70cf39-4b2d-49db-9ac4-9127a77265cc

# Clear and repopulate
python manage.py populate_competencies 6f70cf39-4b2d-49db-9ac4-9127a77265cc --clear-existing
```

## Notes

- The script uses `get_or_create` to avoid duplicate entries
- Multiple milestone descriptions are joined with semicolons
- The script is idempotent - running it multiple times won't create duplicates
- All operations are wrapped in a database transaction for data integrity
