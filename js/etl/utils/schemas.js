/**
 * JSON Schema definitions for graph data validation
 */

export const nodeSchema = {
    type: 'object',
    required: ['id', 'label'],
    properties: {
        id: {
            type: 'string',
            minLength: 1
        },
        label: {
            type: 'string',
            minLength: 1
        },
        content: {
            type: 'string'
        },
        metadata: {
            type: 'object',
            properties: {
                created: {
                    type: 'string',
                    format: 'date-time'
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }
        }
    }
};

export const edgeSchema = {
    type: 'object',
    required: ['source', 'target'],
    properties: {
        source: {
            type: 'string',
            minLength: 1
        },
        target: {
            type: 'string',
            minLength: 1
        },
        label: {
            type: 'string'
        }
    }
};

export const graphSchema = {
    type: 'object',
    required: ['nodes', 'edges'],
    properties: {
        nodes: {
            type: 'array',
            items: nodeSchema
        },
        edges: {
            type: 'array',
            items: edgeSchema
        }
    }
};

// CSV-specific schemas for mapping
export const csvNodeSchema = {
    requiredColumns: ['label'],
    optionalColumns: ['id', 'content', 'tags'],
    columnMapping: {
        'id': 'id',
        'label': 'label',
        'title': 'label',
        'name': 'label',
        'content': 'content',
        'description': 'content',
        'body': 'content',
        'tags': 'metadata.tags',
        'categories': 'metadata.tags',
        'keywords': 'metadata.tags'
    }
};

export const csvEdgeSchema = {
    requiredColumns: ['source', 'target'],
    optionalColumns: ['label', 'type', 'relationship'],
    columnMapping: {
        'source': 'source',
        'from': 'source',
        'source_id': 'source',
        'target': 'target',
        'to': 'target',
        'target_id': 'target',
        'label': 'label',
        'type': 'label',
        'relationship': 'label'
    }
};
