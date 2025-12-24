# ETL Test Data

This directory contains sample data files for testing the ETL (Extract, Transform, Load) functionality.

## Files

### CSV Files

1. **sample-nodes.csv**
   - Contains sample nodes about AI and machine learning topics
   - Columns: label, content, tags
   - 8 nodes total

2. **sample-edges.csv**
   - Contains relationships between the nodes
   - Columns: source, target, label
   - 10 edges total
   - Note: Source/target values match the labels in sample-nodes.csv

### Markdown Files

1. **article1.md**
   - Article about Introduction to AI
   - Contains frontmatter metadata (title, tags, created date)
   - Includes wiki-style links [[Link Name]]

2. **article2.md**
   - Article about Machine Learning Basics
   - Contains frontmatter metadata
   - Includes wiki-style links and hashtags

## Usage

### Import CSV Nodes

1. Click "File" → "ETL Import"
2. Select "CSV File"
3. Choose `sample-nodes.csv`
4. Select "Nodes" as data type
5. Enable transformations (validate, normalize, dedupe)
6. Choose merge strategy
7. Click "Import"

### Import CSV Edges

After importing nodes:

1. Click "File" → "ETL Import"
2. Select "CSV File"
3. Choose `sample-edges.csv`
4. Select "Edges" as data type
5. Enable transformations
6. Choose "Append" or "Merge" strategy
7. Click "Import"

### Import Markdown Files

1. Click "File" → "ETL Import"
2. Select "Markdown Files"
3. Choose both `article1.md` and `article2.md`
4. Enable "Extract frontmatter metadata"
5. Enable "Generate edges from [[wiki-links]]"
6. Enable transformations
7. Choose merge strategy
8. Click "Import"

## Expected Results

### After CSV Import

- 8 nodes with AI/ML topics
- 10 edges showing relationships
- Tags automatically parsed from CSV

### After Markdown Import

- 2 additional nodes (Introduction to AI, Machine Learning Basics)
- Edges automatically generated from [[wiki-links]]
- Frontmatter metadata extracted (tags, created dates)
- Hashtags extracted from content

## Tips

- Use "Dry run" to preview imports before applying
- Enable "Deduplicate" to avoid duplicate nodes
- The enricher will extract keywords and calculate reading time
- Markdown links like [[Machine Learning]] will create edges if the target node exists
