import type { Root } from 'mdast'

/*
    MDX wraps a table cell that only has text in a paragraph:

        <td><p>text</p></td>

    which is not what a Markdown table makes.

    This  removes  the  paragraph when it is the only content of
    the <th>, <td>, <Th> or <Td>.
*/

interface Node {
    type: string
    name?: string | null
    children?: Node[]
}

// written by mdx-tables.ts (see `renderCell`)
const CELLS = new Set(['th', 'td', 'Th', 'Td'])

function unwrap(node: Node): void {
    if (!node.children) return

    if (
        node.type             === 'mdxJsxFlowElement' &&
        node.name             !=  null                &&
        CELLS.has(node.name)                          &&
        node.children.length  === 1                   &&
        node.children[0].type === 'paragraph'
    ) {
        node.children = node.children[0].children ?? []
    }

    for (const child of node.children) unwrap(child)
}

export default function remarkTableCells() {
    return (tree: Root): void => {
        unwrap(tree as unknown as Node)
    }
}
