# ETL Framework User Guide

## Overview

The ETL (Extract, Transform, Load) framework enables you to import data from various sources into your Knowledge Graph application. This guide explains how to use the ETL import feature.

## Quick Start

1. Click **"File" → "ETL Import"** in the application header
2. Select your data source (JSON, CSV, API, or Markdown)
3. Configure the source settings
4. Choose transformation options
5. Select a load strategy
6. Click **"Import"**

## Data Sources

### 1. JSON File

Import graph data from JSON files.

**Supported Formats:**
- Full graph structure with nodes and edges arrays
- Array of node objects
- Single node object

**Example JSON:**
```json
{
  "nodes": [
    {
      "id": "node_1",
      "label": "Example Node",
      "content": "# Example\n\nContent here...",
      "metadata": {
        "tags": ["example", "demo"]
      }
    }
  ],
  "edges": [
    {
      "source": "node_1",
      "target": "node_2",
      "label": "connects to"
    }
  ]
}
```

**Steps:**
1. Select "JSON File"
2. Choose your JSON file
3. Click "Import"

### 2. CSV File

Import nodes or edges from CSV spreadsheets.

**Node CSV Format:**
```csv
label,content,tags
Node A,Content for node A,tag1;tag2
Node B,Content for node B,tag3;tag4
```

**Edge CSV Format:**
```csv
source,target,label
Node A,Node B,connects to
Node B,Node C,depends on
```

**Column Mapping:**
The normalizer automatically maps common column names:
- `label`, `title`, `name` → node label
- `content`, `description`, `body` → node content
- `tags`, `categories`, `keywords` → metadata tags
- `source`, `from` → edge source
- `target`, `to` → edge target

**Steps:**
1. Select "CSV File"
2. Choose your CSV file
3. Select data type (Nodes or Edges)
4. Ensure "CSV has header row" is checked if your file has headers
5. Click "Import"

**Tips:**
- Use semicolons or commas to separate multiple tags
- IDs are auto-generated for nodes if not provided
- Edge source/target should match node labels (not IDs)

### 3. REST API

Import data from web APIs.

**Requirements:**
- Public API or API with authentication
- JSON response format
- CORS-enabled endpoint (or same-origin)

**Steps:**
1. Select "REST API"
2. Enter the API URL (e.g., `https://api.example.com/articles`)
3. (Optional) Select authentication method and enter token
4. (Optional) Enter JSON path to data array (e.g., `data.items`)
5. Click "Import"

**Authentication Options:**
- **None**: Public APIs
- **Bearer Token**: OAuth 2.0 / JWT
- **API Key**: Custom API keys

**JSON Path Example:**
If your API returns:
```json
{
  "status": "success",
  "data": {
    "items": [/* your nodes here */]
  }
}
```
Enter path: `data.items`

### 4. Markdown Files

Import notes from Markdown files with automatic edge generation.

**Frontmatter Support:**
```markdown
---
title: My Note
tags: [concept, important]
created: 2025-01-15
---

# Content

Your markdown content here...

Link to [[Another Note]] or [[Concept]].
```

**Features:**
- Extracts frontmatter metadata (YAML-like format)
- Generates edges from wiki-style links `[[Link]]`
- Auto-detects title from filename if not in frontmatter
- Preserves full markdown content

**Steps:**
1. Select "Markdown Files"
2. Choose one or multiple `.md` files
3. Enable "Extract frontmatter metadata" (recommended)
4. Enable "Generate edges from [[wiki-links]]" (recommended)
5. Click "Import"

**Wiki-Links:**
- Format: `[[Page Name]]`
- Creates edges between linked notes
- Target note must exist or be imported in the same batch

## Transformations

### Validator

**What it does:**
- Validates data structure
- Checks required fields (id, label)
- Validates edge references
- Ensures data types are correct

**When to use:**
- Always recommended for data quality
- Essential for untrusted data sources

### Normalizer

**What it does:**
- Converts data to graph schema
- Maps field names to standard format
- Generates IDs if missing
- Parses tags from strings
- Sets default values

**When to use:**
- Always recommended
- Required for CSV and API imports
- Handles various data formats

**Field Mapping:**
- `title` → `label`
- `name` → `label`
- `description` → `content`
- `body` → `content`
- `categories` → `metadata.tags`

### Enricher

**What it does:**
- Extracts keywords from content
- Calculates content statistics (word count, reading time)
- Extracts hashtags (#tag)
- Extracts URLs
- Generates summaries
- Auto-categorizes content

**When to use:**
- Optional but recommended for rich metadata
- Useful for large text content
- Helps with search and organization

**Generated Metadata:**
```javascript
{
  keywords: ["important", "concept", "example"],
  stats: {
    characters: 1234,
    words: 200,
    sentences: 15,
    paragraphs: 5,
    readingTime: 1 // minutes
  },
  hashtags: ["example", "demo"],
  urls: ["https://example.com"]
}
```

### Deduplicator

**What it does:**
- Detects duplicate nodes
- Merges or skips duplicates
- Updates edge references
- Removes duplicate edges

**Options:**
- **By label**: Match nodes with same label (case-insensitive)
- **By ID**: Match nodes with same ID
- **By content**: Match nodes with identical content

**Strategies:**
- **Skip**: Keep existing, ignore new
- **Overwrite**: Replace existing with new
- **Merge**: Combine properties, merge tags

**When to use:**
- Recommended when re-importing data
- Prevents duplicate nodes
- Useful for incremental updates

## Load Strategies

### Merge (Recommended)

**Behavior:**
- Update existing nodes (by ID)
- Add new nodes
- Add new edges
- Combine with existing graph

**Use when:**
- Adding new data to existing graph
- Updating specific nodes
- Incremental data imports

### Replace

**Behavior:**
- Delete ALL existing data
- Load new data only

**Use when:**
- Starting fresh
- Complete data replacement
- Testing with sample data

⚠️ **Warning**: This deletes your entire graph!

### Update

**Behavior:**
- Update existing nodes completely
- Add new nodes
- Add new edges only

**Use when:**
- Refreshing existing data
- Syncing with external source
- Adding related data

### Append

**Behavior:**
- Add only new nodes (skip existing)
- Add only new edges (skip existing)
- Never modify existing data

**Use when:**
- Adding supplementary data
- Avoiding accidental updates
- Conservative imports

## Dry Run Mode

**What it does:**
- Previews the import without saving
- Shows how many nodes/edges would be added
- Validates data without changes

**Use when:**
- Testing import configuration
- Validating data source
- Checking for duplicates
- First time importing from a source

## Step-by-Step Examples

### Example 1: Import CSV Nodes

**Goal**: Import a list of concepts from a spreadsheet

1. Prepare CSV file:
```csv
label,content,tags
Machine Learning,# ML\n\nML is...,AI;technology
Neural Networks,# NN\n\nNN are...,AI;deep-learning
```

2. Open ETL Import modal
3. Select "CSV File"
4. Choose your file
5. Confirm "CSV has header row" is checked
6. Select data type: "Nodes"
7. Enable transformations:
   - ✅ Validate
   - ✅ Normalize
   - ✅ Enrich
   - ✅ Deduplicate
8. Choose strategy: "Merge"
9. Enable "Dry run" for first attempt
10. Click "Import"
11. Review preview
12. Disable "Dry run" and import again

### Example 2: Import Markdown Notes

**Goal**: Import existing markdown notes with automatic linking

1. Prepare markdown files with frontmatter and wiki-links
2. Open ETL Import modal
3. Select "Markdown Files"
4. Choose all `.md` files
5. Enable both options:
   - ✅ Extract frontmatter metadata
   - ✅ Generate edges from [[wiki-links]]
6. Enable transformations (all recommended)
7. Choose strategy: "Merge"
8. Click "Import"

### Example 3: Import from API

**Goal**: Import articles from a CMS API

1. Open ETL Import modal
2. Select "REST API"
3. Enter URL: `https://cms.example.com/api/articles`
4. Select auth: "Bearer Token"
5. Enter token: `your-api-token`
6. Enter JSON path: `data.articles`
7. Enable transformations
8. Choose strategy: "Merge"
9. Click "Import"

## Troubleshooting

### Import Fails with Validation Errors

**Problem**: Data doesn't match expected schema

**Solutions:**
- Enable "Normalizer" to auto-fix field names
- Check CSV column names
- Verify JSON structure
- Review error messages for specific issues

### Duplicate Nodes Created

**Problem**: Same nodes imported multiple times

**Solutions:**
- Enable "Deduplicator" transformer
- Use "Update" or "Merge" strategy instead of "Append"
- Ensure node IDs or labels are consistent

### Edges Not Created

**Problem**: CSV edges import doesn't create connections

**Solutions:**
- Import nodes BEFORE edges
- Ensure edge source/target match node labels exactly
- Enable "Validate" to see specific errors
- Check for typos in node labels

### Missing Edges from Markdown

**Problem**: Wiki-links don't create edges

**Solutions:**
- Ensure "Generate edges from [[wiki-links]]" is enabled
- Target nodes must exist (import them in same batch)
- Check wiki-link syntax: `[[Exact Label]]`
- Labels are case-sensitive

### API Import Returns No Data

**Problem**: API extraction finds no items

**Solutions:**
- Check API URL is correct and accessible
- Verify authentication token
- Check CORS settings
- Verify JSON path matches response structure
- Test API in browser/Postman first

### Content Has Literal \n Instead of Line Breaks

**Problem**: CSV content shows \n characters

**Solutions:**
- Use actual line breaks in CSV (quoted fields)
- Or handle \n in post-processing
- Consider using JSON or Markdown instead for multi-line content

## Best Practices

### 1. Always Test with Dry Run First

Before importing large datasets, use dry run mode to:
- Validate data structure
- Check for duplicates
- Preview import results
- Verify transformations work correctly

### 2. Enable Deduplication

Always enable deduplication when:
- Re-importing data
- Merging from multiple sources
- Updating existing graphs

### 3. Use Meaningful Labels

- Keep labels concise but descriptive
- Use consistent naming conventions
- Avoid special characters
- Labels are used for matching and display

### 4. Tag Everything

- Add relevant tags to all nodes
- Use consistent tag naming
- Tags enable filtering and grouping
- Enricher can auto-extract tags

### 5. Structure Your Data

- Use CSV for simple tabular data
- Use JSON for complex nested data
- Use Markdown for rich text content
- Use APIs for dynamic data sources

### 6. Incremental Imports

For large datasets:
- Import in batches
- Use "Merge" strategy
- Monitor progress
- Check for errors after each batch

### 7. Backup Before Replace

Before using "Replace" strategy:
- Export current graph (File → Export JSON)
- Save backup file
- Test import with sample data first

## Advanced Usage

### Custom Field Mapping

When importing CSV with non-standard columns, the normalizer will:
- Auto-map common field names
- Keep unmapped fields as-is
- Support nested fields via dot notation

### Batch Processing

The ETL framework processes data in batches:
- Default: 100 items per batch
- Progress updates in real-time
- Configurable for performance

### Error Handling

- Validation errors are reported with details
- Continue-on-error option available
- Error logs can be exported
- Failed items are tracked

### Performance Tips

- Limit batch size for large imports (coming in future updates)
- Disable enricher for faster imports of simple data
- Use replace strategy for cleanest imports
- Close other browser tabs during large imports

## API Reference

For developers who want to use the ETL framework programmatically:

```javascript
import { ETLManager } from './js/etl/etl-manager.js';

const etlManager = new ETLManager(dataManager);

// Execute ETL pipeline
const result = await etlManager.execute({
  source: {
    type: 'csv',
    config: { file: csvFile, header: true }
  },
  transformers: [
    { type: 'validator' },
    { type: 'normalizer' },
    { type: 'enricher' },
    { type: 'deduplicator' }
  ],
  loader: {
    type: 'merge-strategy',
    config: { strategy: 'merge' }
  },
  options: {
    dryRun: false
  }
});

console.log(result);
```

See `docs/ETL_ARCHITECTURE.md` for detailed API documentation.

## Support & Feedback

For questions or issues:
1. Check this user guide
2. Review sample data in `test-data/`
3. Check the architecture documentation
4. Open an issue on GitHub

## Version History

- **v1.0** (2025-12-24)
  - Initial release
  - JSON, CSV, API, Markdown extractors
  - Validator, Normalizer, Enricher, Deduplicator transformers
  - Batch loader with progress tracking
  - Multiple merge strategies
  - Dry run mode
