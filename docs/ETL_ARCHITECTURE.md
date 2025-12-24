# ETL Framework Architecture

## Overview

A full-featured, browser-based ETL (Extract, Transform, Load) framework for the D3 Knowledge Graph application.

## Design Principles

1. **Browser-First**: Runs entirely in the browser, no server required
2. **Modular**: Pluggable extractors, transformers, and loaders
3. **Type-Safe**: Schema validation at every stage
4. **Progressive**: Supports batch processing with progress tracking
5. **Resilient**: Error handling, rollback, and dry-run capabilities
6. **Extensible**: Easy to add new data sources and transformations

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ETL Manager                               │
│                    (Orchestration Layer)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   EXTRACT    │  →   │  TRANSFORM   │  →   │     LOAD     │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                     │                      │          │
│  ┌──────▼──────────┐   ┌──────▼───────────┐  ┌──────▼────────┐│
│  │ Extractors:     │   │ Transformers:    │  │ Loaders:      ││
│  │ • JSONExtractor │   │ • Validator      │  │ • BatchLoader ││
│  │ • CSVExtractor  │   │ • Normalizer     │  │ • Merger      ││
│  │ • APIExtractor  │   │ • Enricher       │  │ • Replacer    ││
│  │ • MDExtractor   │   │ • Deduplicator   │  │ • Updater     ││
│  │ • URLExtractor  │   │ • Mapper         │  │               ││
│  └─────────────────┘   │ • TagExtractor   │  └───────────────┘│
│                        │ • EdgeGenerator   │                   │
│                        └───────────────────┘                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Cross-Cutting Concerns:                                        │
│  • Error Handling  • Logging  • Progress Tracking               │
│  • Schema Validation  • Rollback  • Dry-Run Mode                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   DataManager    │
                    │   (Persistence)  │
                    └──────────────────┘
```

## Component Details

### 1. ETL Manager (`js/etl/etl-manager.js`)

**Responsibilities:**
- Pipeline orchestration
- Progress tracking
- Error handling and rollback
- Dry-run mode
- Event emission

**Key Methods:**
```javascript
class ETLManager {
  constructor(dataManager)

  // Pipeline execution
  async execute(config)
  async executePipeline(extractor, transformers, loader)

  // Control
  pause()
  resume()
  cancel()

  // Events
  on(event, callback)
  emit(event, data)
}
```

**Configuration Schema:**
```javascript
{
  source: {
    type: 'csv|json|api|markdown|url',
    config: { /* source-specific config */ }
  },
  transformers: [
    { type: 'validator', config: {} },
    { type: 'normalizer', config: {} },
    { type: 'enricher', config: {} }
  ],
  loader: {
    type: 'merge|replace|update|append',
    config: { /* loader-specific config */ }
  },
  options: {
    dryRun: false,
    batchSize: 100,
    continueOnError: false
  }
}
```

### 2. Extractors

#### Base Extractor (`js/etl/extractors/base-extractor.js`)

```javascript
class BaseExtractor {
  async extract(config)
  async validate(config)
  getSchema()
}
```

#### JSON Extractor (`js/etl/extractors/json-extractor.js`)

**Capabilities:**
- File upload
- URL fetch
- Paste JSON text
- Schema validation

**Config:**
```javascript
{
  source: 'file|url|text',
  data: File|string,
  schema: { /* JSON Schema */ }
}
```

#### CSV Extractor (`js/etl/extractors/csv-extractor.js`)

**Dependencies:** PapaParse

**Capabilities:**
- Parse CSV files
- Header detection
- Type inference
- Delimiter auto-detection
- Column mapping

**Config:**
```javascript
{
  file: File,
  delimiter: ',',
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  mapping: {
    csvColumn: 'graphField'
  }
}
```

#### API Extractor (`js/etl/extractors/api-extractor.js`)

**Capabilities:**
- REST API fetching
- Pagination support
- Authentication (Bearer, API Key)
- Rate limiting
- Response transformation

**Config:**
```javascript
{
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: {},
  auth: {
    type: 'bearer|apikey',
    token: '...'
  },
  pagination: {
    type: 'offset|cursor|page',
    pageSize: 100
  },
  transform: (response) => response.data
}
```

#### Markdown Extractor (`js/etl/extractors/markdown-extractor.js`)

**Capabilities:**
- Parse markdown files
- Extract frontmatter metadata
- Generate nodes from headings
- Auto-link detection

**Config:**
```javascript
{
  files: FileList,
  extractMetadata: true,
  generateEdges: true,
  linkPattern: /\[\[(.+?)\]\]/g  // Wiki-style links
}
```

### 3. Transformers

#### Validator (`js/etl/transformers/validator.js`)

**Dependencies:** Ajv

**Capabilities:**
- JSON Schema validation
- Custom validation rules
- Required field checking
- Type validation
- Format validation

**Schema:**
```javascript
{
  nodes: {
    type: 'array',
    items: {
      type: 'object',
      required: ['id', 'label'],
      properties: {
        id: { type: 'string' },
        label: { type: 'string', minLength: 1 },
        content: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  },
  edges: {
    type: 'array',
    items: {
      type: 'object',
      required: ['source', 'target'],
      properties: {
        source: { type: 'string' },
        target: { type: 'string' },
        label: { type: 'string' }
      }
    }
  }
}
```

#### Normalizer (`js/etl/transformers/normalizer.js`)

**Capabilities:**
- Schema normalization
- Field mapping
- Type conversion
- Default value injection
- ID generation

**Config:**
```javascript
{
  fieldMapping: {
    'title': 'label',
    'body': 'content',
    'categories': 'metadata.tags'
  },
  defaults: {
    'metadata.tags': []
  },
  generateIds: true
}
```

#### Enricher (`js/etl/transformers/enricher.js`)

**Capabilities:**
- Auto-tagging from content
- Metadata extraction
- Content analysis (word count, reading time)
- Timestamp injection
- Summary generation

**Features:**
- Keyword extraction
- Category inference
- Related content suggestions

#### Deduplicator (`js/etl/transformers/deduplicator.js`)

**Capabilities:**
- Duplicate detection (by ID, label, content hash)
- Merge strategies
- Conflict resolution

**Strategies:**
- **Skip**: Keep existing
- **Overwrite**: Replace with new
- **Merge**: Combine properties
- **Prompt**: Ask user

#### Tag Extractor (`js/etl/transformers/tag-extractor.js`)

**Capabilities:**
- Extract hashtags from content
- NLP-based keyword extraction
- Category mapping
- Tag normalization

#### Edge Generator (`js/etl/transformers/edge-generator.js`)

**Capabilities:**
- Auto-generate edges from content
- Wiki-link parsing `[[Node Name]]`
- URL reference detection
- Similarity-based edges

### 4. Loaders

#### Batch Loader (`js/etl/loaders/batch-loader.js`)

**Capabilities:**
- Batch processing
- Progress tracking
- Error recovery
- Transaction support

**Config:**
```javascript
{
  batchSize: 100,
  continueOnError: false,
  onProgress: (progress) => {},
  onError: (error, item) => {}
}
```

#### Merge Strategy (`js/etl/loaders/merge-strategy.js`)

**Strategies:**

1. **Replace**: Clear existing data, load new
2. **Merge**: Combine with existing (deduplicate)
3. **Update**: Update existing nodes, add new
4. **Append**: Add new nodes only, skip existing

**Conflict Resolution:**
- Keep existing
- Use new
- Merge properties
- Newest timestamp wins
- Custom resolver function

### 5. Utilities

#### Schema Definitions (`js/etl/utils/schemas.js`)

**Exports:**
- `graphSchema`: Full graph schema
- `nodeSchema`: Node schema
- `edgeSchema`: Edge schema
- Custom validators

#### Error Handler (`js/etl/utils/error-handler.js`)

**Error Types:**
- ExtractionError
- ValidationError
- TransformationError
- LoadError
- ConfigurationError

**Features:**
- Error logging
- User-friendly messages
- Stack trace preservation
- Recovery suggestions

#### Logger (`js/etl/utils/logger.js`)

**Levels:**
- DEBUG
- INFO
- WARN
- ERROR

**Output:**
- Console
- UI notifications
- Download log file

#### Progress Tracker (`js/etl/utils/progress-tracker.js`)

**Metrics:**
- Total items
- Processed items
- Errors
- Warnings
- Elapsed time
- Estimated remaining time

## Data Flow Example

### CSV Import Flow

```javascript
// 1. EXTRACT
CSVExtractor.extract({
  file: csvFile,
  mapping: {
    'Name': 'label',
    'Description': 'content',
    'Tags': 'metadata.tags'
  }
})
// Output: Raw data array

// 2. TRANSFORM
↓ Validator.transform(data, schema)
  // Validates structure
↓ Normalizer.transform(data, config)
  // Converts types, maps fields
↓ Enricher.transform(data)
  // Adds timestamps, extracts keywords
↓ Deduplicator.transform(data)
  // Removes/merges duplicates

// 3. LOAD
↓ BatchLoader.load(data, 'merge')
  // Merges with existing graph data

// 4. PERSIST
↓ DataManager.setData(mergedData)
  // Saves to localStorage
  // Triggers UI update
```

## UI Integration

### Import Modal (`index.html`)

```html
<div id="etl-import-modal" class="modal">
  <div class="modal-content">
    <h2>Import Data</h2>

    <!-- Source Selection -->
    <div class="etl-source-selector">
      <button data-source="csv">CSV File</button>
      <button data-source="json">JSON File</button>
      <button data-source="api">REST API</button>
      <button data-source="markdown">Markdown Files</button>
    </div>

    <!-- Dynamic Configuration -->
    <div id="etl-config-panel">
      <!-- Source-specific config UI -->
    </div>

    <!-- Transformation Options -->
    <div class="etl-transformers">
      <label><input type="checkbox" name="validate" checked> Validate</label>
      <label><input type="checkbox" name="enrich" checked> Auto-enrich</label>
      <label><input type="checkbox" name="dedupe" checked> Deduplicate</label>
    </div>

    <!-- Load Strategy -->
    <div class="etl-load-strategy">
      <select name="strategy">
        <option value="merge">Merge with existing</option>
        <option value="replace">Replace all</option>
        <option value="update">Update existing</option>
        <option value="append">Append only</option>
      </select>
    </div>

    <!-- Options -->
    <div class="etl-options">
      <label><input type="checkbox" name="dryRun"> Dry run (preview)</label>
    </div>

    <!-- Progress -->
    <div id="etl-progress" class="hidden">
      <progress max="100" value="0"></progress>
      <span class="progress-text">0%</span>
    </div>

    <!-- Actions -->
    <div class="modal-actions">
      <button id="etl-execute">Import</button>
      <button id="etl-cancel">Cancel</button>
    </div>
  </div>
</div>
```

### App Integration (`js/app.js`)

```javascript
import { ETLManager } from './etl/etl-manager.js';

class KnowledgeGraphApp {
  constructor() {
    this.etlManager = new ETLManager(this.dataManager);
    this.setupETLHandlers();
  }

  setupETLHandlers() {
    // Import button
    document.getElementById('etl-import-btn').addEventListener('click', () => {
      this.showETLModal();
    });

    // Progress tracking
    this.etlManager.on('progress', (progress) => {
      this.updateETLProgress(progress);
    });

    // Completion
    this.etlManager.on('complete', (result) => {
      this.handleETLComplete(result);
    });

    // Errors
    this.etlManager.on('error', (error) => {
      this.handleETLError(error);
    });
  }
}
```

## Testing Strategy

### Unit Tests
- Each extractor with sample data
- Each transformer with test cases
- Schema validation
- Error handling

### Integration Tests
- Full ETL pipeline
- Multiple transformers
- Error recovery
- Rollback scenarios

### Sample Data
- `test-data/sample.csv`
- `test-data/sample-api-response.json`
- `test-data/sample-markdown/`

## Performance Considerations

### Large File Handling
- **Streaming**: Process CSV in chunks (PapaParse streaming)
- **Web Workers**: Offload transformation to worker threads
- **Batch Processing**: Process in configurable batch sizes
- **Progress Indication**: Real-time progress updates

### Memory Management
- Limit batch size
- Clear processed data
- Avoid storing entire dataset in memory

### Optimization
- Lazy loading transformers
- Parallel processing where possible
- Memoization for expensive operations

## Security Considerations

### Input Validation
- Schema validation (Ajv)
- XSS prevention in content
- File size limits
- MIME type checking

### API Security
- CORS handling
- Authentication token protection
- Rate limiting

### Data Sanitization
- HTML escape user content
- URL validation
- Safe eval avoidance

## Extension Points

### Custom Extractors
```javascript
class CustomExtractor extends BaseExtractor {
  async extract(config) {
    // Implementation
  }
}

ETLManager.registerExtractor('custom', CustomExtractor);
```

### Custom Transformers
```javascript
class CustomTransformer extends BaseTransformer {
  async transform(data, config) {
    // Implementation
  }
}

ETLManager.registerTransformer('custom', CustomTransformer);
```

### Custom Validators
```javascript
const customFormat = {
  name: 'custom-format',
  validate: (value) => { /* ... */ }
};

Validator.addFormat(customFormat);
```

## Dependencies

### External Libraries (CDN)
1. **PapaParse** 5.4.1
   - CSV parsing
   - CDN: `https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js`

2. **Ajv** 8.17.1
   - JSON Schema validation
   - CDN: `https://cdn.jsdelivr.net/npm/ajv@8.17.1/dist/ajv7.min.js`

### Native APIs
- Fetch API (API extraction)
- FileReader API (file reading)
- Blob API (export)
- Web Workers API (parallel processing)

## File Structure

```
js/etl/
├── etl-manager.js              # Main orchestrator
├── extractors/
│   ├── base-extractor.js       # Abstract base class
│   ├── json-extractor.js       # JSON file/URL extraction
│   ├── csv-extractor.js        # CSV file parsing
│   ├── api-extractor.js        # REST API fetching
│   ├── markdown-extractor.js   # Markdown file parsing
│   └── url-extractor.js        # URL content fetching
├── transformers/
│   ├── base-transformer.js     # Abstract base class
│   ├── validator.js            # Schema validation
│   ├── normalizer.js           # Data normalization
│   ├── enricher.js             # Content enrichment
│   ├── deduplicator.js         # Duplicate handling
│   ├── tag-extractor.js        # Tag extraction
│   ├── edge-generator.js       # Auto-edge creation
│   └── mapper.js               # Field mapping
├── loaders/
│   ├── base-loader.js          # Abstract base class
│   ├── batch-loader.js         # Batch processing
│   └── merge-strategy.js       # Merge strategies
├── utils/
│   ├── schemas.js              # JSON schemas
│   ├── error-handler.js        # Error management
│   ├── logger.js               # Logging utility
│   ├── progress-tracker.js     # Progress tracking
│   └── validators.js           # Custom validators
└── index.js                    # Public API exports
```

## Configuration Examples

### Example 1: CSV Import

```javascript
await etlManager.execute({
  source: {
    type: 'csv',
    config: {
      file: csvFile,
      mapping: {
        'Node Name': 'label',
        'Description': 'content',
        'Tags': 'metadata.tags'
      }
    }
  },
  transformers: [
    { type: 'validator' },
    { type: 'normalizer' },
    { type: 'enricher', config: { extractKeywords: true } }
  ],
  loader: {
    type: 'merge',
    config: { strategy: 'update-or-add' }
  }
});
```

### Example 2: API Import

```javascript
await etlManager.execute({
  source: {
    type: 'api',
    config: {
      url: 'https://api.example.com/articles',
      pagination: { type: 'offset', pageSize: 50 },
      transform: (response) => response.articles
    }
  },
  transformers: [
    { type: 'mapper', config: {
      'title': 'label',
      'body': 'content',
      'tags': 'metadata.tags'
    }},
    { type: 'edge-generator', config: { detectLinks: true } }
  ],
  loader: {
    type: 'append'
  }
});
```

### Example 3: Markdown Folder Import

```javascript
await etlManager.execute({
  source: {
    type: 'markdown',
    config: {
      files: markdownFiles,
      extractMetadata: true,
      linkPattern: /\[\[(.+?)\]\]/g
    }
  },
  transformers: [
    { type: 'edge-generator', config: { fromLinks: true } },
    { type: 'deduplicator', config: { by: 'label', strategy: 'merge' } }
  ],
  loader: {
    type: 'merge'
  }
});
```

## Success Metrics

- Import success rate > 95%
- Processing speed: >1000 nodes/second
- Memory usage: <100MB for 10K nodes
- Error recovery: 100% rollback success
- User feedback: Real-time progress updates

## Future Enhancements

1. **Export Transformers**: ETL for exporting to other formats
2. **Scheduled Imports**: Periodic API polling
3. **Incremental Sync**: Delta imports from APIs
4. **Graph Diff**: Show changes before applying
5. **Preset Configs**: Save/load ETL configurations
6. **Plugin System**: Community-contributed extractors/transformers
7. **AI Enhancement**: LLM-powered content enrichment
8. **Version Control**: Track import history

---

**Document Version**: 1.0
**Last Updated**: 2025-12-24
**Author**: Claude Code ETL Team
