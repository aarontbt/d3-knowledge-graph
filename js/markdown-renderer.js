/**
 * Markdown Renderer Module
 * Renders markdown content using marked.js
 */

export class MarkdownRenderer {
    constructor() {
        // Configure marked options
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: true,
                mangle: false
            });
        }
    }

    /**
     * Render markdown to HTML
     */
    render(markdown) {
        if (!markdown) {
            return '<p class="empty-state">No content available</p>';
        }

        try {
            if (typeof marked !== 'undefined') {
                return marked.parse(markdown);
            } else {
                // Fallback if marked.js is not loaded
                return this.basicMarkdown(markdown);
            }
        } catch (error) {
            console.error('Markdown rendering error:', error);
            return '<p class="error">Error rendering markdown content</p>';
        }
    }

    /**
     * Basic markdown parser fallback
     */
    basicMarkdown(text) {
        return text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
            .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
            .replace(/\n$/gim, '<br />');
    }

    /**
     * Render node details with metadata
     */
    renderNode(node) {
        if (!node) {
            return '<p class="empty-state">Select a node to view details</p>';
        }

        const contentHtml = this.render(node.content);

        // Render metadata
        let metadataHtml = '';
        if (node.metadata) {
            metadataHtml = '<div class="node-metadata">';

            // Created date
            if (node.metadata.created) {
                const date = new Date(node.metadata.created);
                metadataHtml += `<p><strong>Created:</strong> ${date.toLocaleDateString()}</p>`;
            }

            // Modified date
            if (node.metadata.modified) {
                const date = new Date(node.metadata.modified);
                metadataHtml += `<p><strong>Modified:</strong> ${date.toLocaleDateString()}</p>`;
            }

            // Tags
            if (node.metadata.tags && node.metadata.tags.length > 0) {
                metadataHtml += '<p><strong>Tags:</strong></p>';
                metadataHtml += '<div class="node-tags">';
                node.metadata.tags.forEach(tag => {
                    metadataHtml += `<span class="tag">${this.escapeHtml(tag)}</span>`;
                });
                metadataHtml += '</div>';
            }

            metadataHtml += '</div>';
        }

        return contentHtml + metadataHtml;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Strip markdown formatting for plain text
     */
    stripMarkdown(markdown) {
        if (!markdown) return '';

        return markdown
            .replace(/^#+\s+/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/>\s+/g, '')
            .replace(/\n+/g, ' ')
            .trim();
    }

    /**
     * Get preview text from markdown
     */
    getPreview(markdown, maxLength = 150) {
        const plain = this.stripMarkdown(markdown);
        if (plain.length <= maxLength) {
            return plain;
        }
        return plain.substring(0, maxLength).trim() + '...';
    }
}
