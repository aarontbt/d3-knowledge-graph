# D3 Knowledge Graph Visualizer

A modern, interactive knowledge graph web application for visualizing and managing interconnected information using D3.js force-directed layouts, JSON data structures, and Markdown content.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Core Functionality
- **Interactive Graph Visualization**: Force-directed graph layout powered by D3.js v7
- **Markdown Support**: Rich text content for each node using Markdown syntax
- **JSON Data Structure**: Lightweight, portable graph data in JSON format
- **CRUD Operations**: Create, read, update, and delete nodes and edges
- **Search & Filter**: Find nodes by label, content, or tags
- **Data Persistence**: Automatic saving to browser localStorage
- **Import/Export**: Load and save graphs as JSON files

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Easy-on-the-eyes interface with modern styling
- **Interactive Controls**: Zoom, pan, drag nodes, and center graph
- **Side Panel**: View detailed node information with rendered Markdown
- **Modal Dialogs**: Intuitive forms for adding and editing content
- **Real-time Updates**: Live graph updates as you make changes

### Visualization
- **Force-Directed Layout**: Automatic, physics-based node positioning
- **Node Selection**: Click to select, double-click to edit
- **Edge Labels**: Relationship types displayed on connections
- **Visual Feedback**: Hover effects and selection highlighting
- **Graph Statistics**: Live node and edge count display

## Quick Start

### Option 1: Direct Browser
Simply open `index.html` in a modern web browser. No build process or server required!

```bash
# Clone the repository
git clone https://github.com/yourusername/d3-knowledge-graph.git
cd d3-knowledge-graph

# Open in browser (macOS)
open index.html

# Or (Linux)
xdg-open index.html

# Or (Windows)
start index.html
```

### Option 2: Local Server
For best results, serve via a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`

## Project Structure

```
d3-knowledge-graph/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Application styles
├── js/
│   ├── app.js             # Main application logic
│   ├── graph.js           # D3.js graph visualization
│   ├── data-manager.js    # Data operations and persistence
│   └── markdown-renderer.js # Markdown parsing and rendering
├── data/
│   └── sample-graph.json  # Sample knowledge graph
├── LICENSE
└── README.md
```

## Data Format

### Graph Structure

Graphs are stored as JSON with two main arrays: `nodes` and `edges`.

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Node Title",
      "content": "# Markdown Content\\n\\nYour content here...",
      "metadata": {
        "created": "2025-10-21T00:00:00.000Z",
        "tags": ["tag1", "tag2"]
      }
    }
  ],
  "edges": [
    {
      "source": "node-id-1",
      "target": "node-id-2",
      "label": "relationship type"
    }
  ]
}
```

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (auto-generated) |
| `label` | string | Yes | Display name of the node |
| `content` | string | No | Markdown-formatted content |
| `metadata` | object | No | Additional metadata |
| `metadata.created` | string | Auto | ISO 8601 timestamp |
| `metadata.modified` | string | Auto | ISO 8601 timestamp |
| `metadata.tags` | array | No | Array of tag strings |

### Edge Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `source` | string | Yes | Source node ID |
| `target` | string | Yes | Target node ID |
| `label` | string | No | Relationship description |

## Usage Guide

### Creating Nodes

1. Click the **"+ Add Node"** button in the header
2. Enter a label (required)
3. Add Markdown content (optional)
4. Add comma-separated tags (optional)
5. Click **"Save"**

### Editing Nodes

**Method 1**: Double-click a node in the graph

**Method 2**:
1. Click a node to select it
2. View details in the side panel
3. Click the **"Edit"** button

### Creating Edges

1. Click the **"+ Add Edge"** button
2. Select source and target nodes
3. Add an optional relationship label
4. Click **"Create Edge"**

**Tip**: Select a node first to pre-populate the source field

### Deleting Content

**Delete Node**:
1. Select the node
2. Click **"Delete"** in the side panel
3. Confirm deletion (this also removes connected edges)

**Delete Edge**: Currently edges are removed by deleting connected nodes

### Search

1. Enter a search term in the search box
2. Click **"Search"** or press Enter
3. Results are highlighted and displayed
4. For single results, the node is automatically selected

Search looks through:
- Node labels
- Node content
- Tags

### Import/Export

**Export**:
1. Click **"File"** → **"Export JSON"**
2. Your graph is downloaded as a JSON file

**Import**:
1. Click **"File"** → **"Import JSON"**
2. Select a JSON file
3. Your current graph is replaced

**Load Sample**:
- Click **"File"** → **"Load Sample"** to see an example graph

**Clear Graph**:
- Click **"File"** → **"Clear Graph"** to start fresh

### Graph Controls

| Control | Action |
|---------|--------|
| **+** button | Zoom in |
| **−** button | Zoom out |
| **⟲** button | Reset zoom |
| **Center** button | Center graph in viewport |
| **Drag nodes** | Reposition nodes manually |
| **Drag canvas** | Pan the view |
| **Mouse wheel** | Zoom in/out |

## Markdown Support

Node content supports full Markdown syntax:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- Unordered lists
- Another item

1. Ordered lists
2. Second item

[Links](https://example.com)

`inline code`

```language
Code blocks
```

> Blockquotes
```

## Technology Stack

- **D3.js v7**: Data visualization and force simulation
- **Marked.js**: Markdown parsing and rendering
- **Vanilla JavaScript**: ES6 modules, no framework dependencies
- **LocalStorage API**: Client-side data persistence
- **CSS3**: Modern styling with CSS Grid and Flexbox

## Browser Support

Works in all modern browsers that support:
- ES6 modules
- LocalStorage API
- SVG
- D3.js v7

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Architecture

The application follows a modular architecture:

1. **GraphVisualizer** (`graph.js`): Handles D3.js rendering and interactions
2. **DataManager** (`data-manager.js`): Manages graph data and persistence
3. **MarkdownRenderer** (`markdown-renderer.js`): Converts Markdown to HTML
4. **KnowledgeGraphApp** (`app.js`): Orchestrates all components

### Extending the App

**Add a new node property**:
1. Update the data structure in `data-manager.js`
2. Add form fields in `index.html`
3. Update the rendering logic in `app.js`

**Customize the layout**:
Modify force simulation parameters in `graph.js`:

```javascript
this.simulation = d3.forceSimulation()
    .force('link', d3.forceLink().distance(150))  // Change link distance
    .force('charge', d3.forceManyBody().strength(-400))  // Change repulsion
    .force('center', d3.forceCenter(width / 2, height / 2));
```

**Change the theme**:
Edit CSS variables in `css/style.css`:

```css
:root {
    --primary-color: #4a90e2;
    --dark-bg: #1e1e1e;
    /* ... */
}
```

## Use Cases

- **Personal Knowledge Management**: Organize notes, ideas, and concepts
- **Research**: Map research papers, concepts, and relationships
- **Project Planning**: Visualize project dependencies and tasks
- **Learning**: Create study guides with interconnected topics
- **Documentation**: Build interactive documentation systems
- **Brainstorming**: Capture and connect ideas visually

## Performance

- **Recommended**: Up to 100 nodes for smooth interaction
- **Maximum**: Up to 500 nodes (may experience slowdown)
- **Large Graphs**: Consider hierarchical layouts or filtering for 500+ nodes

## Limitations

- No real-time collaboration (single-user, local storage)
- No server-side persistence (data stored in browser)
- Limited to browser localStorage quota (~5-10MB)
- Force-directed layout can be unpredictable for large graphs

## Roadmap

- [ ] Undo/redo functionality
- [ ] Graph templates and themes
- [ ] Export to other formats (PNG, SVG, PDF)
- [ ] Advanced search with filters
- [ ] Multiple graph views (tree, radial, hierarchical)
- [ ] Collaborative editing with backend
- [ ] Graph analytics (centrality, clustering)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **D3.js** - Mike Bostock and contributors
- **Marked.js** - Christopher Jeffrey and contributors
- Inspired by various knowledge graph and note-taking applications

## Support

If you encounter any issues or have questions:
1. Check the [documentation](#usage-guide)
2. Review the sample graph for examples
3. Open an issue on GitHub

---

Built with ❤️ using D3.js and modern web technologies
