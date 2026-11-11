import type { Root } from 'mdast'

/*
    Turns the math nodes made by remark-math into <LaTeX>.

        $x^2$       ->  <LaTeX>x^2</LaTeX>
        $$x^2$$     ->  <LaTeX block>x^2</LaTeX>
        $$ fence    ->  <LaTeX block>...</LaTeX>

    The  equation  is  put  in  the  tree as a text node, so MDX
    compiles it to a JavaScript string.

    Real dollar are written as `\$`.
*/

interface Node {
    type: string
    value?: string
    children?: Node[]
    position?: { start: { offset?: number } }
}

const isBlock = (node: Node): boolean => node.type === 'mdxJsxFlowElement'

function latex(node: Node, block: boolean): Node {
    return {
        type: block ? 'mdxJsxFlowElement' : 'mdxJsxTextElement',
        name: 'LaTeX',
        attributes: block ? [{ type: 'mdxJsxAttribute', name: 'block', value: null }] : [],
        children: [{ type: 'text', value: node.value }],
    } as Node
}

export default function remarkLatex() {
    return (tree: Root, file: { value: unknown }): void => {
        const source = String(file.value)

        const convert = (node: Node): Node[] => {
            if (node.type === 'math') return [latex(node, true)]
            if (node.type === 'inlineMath') {
                const start = node.position?.start.offset
                return [latex(node, start !== undefined && source.startsWith('$$', start))]
            }
            if (node.children) node.children = node.children.flatMap(convert)

            // if a paragraph has block equations inside, split around them
            if (node.type === 'paragraph' && node.children?.some(isBlock)) {
                const parts: Node[] = []
                let run: Node[] = []
                const flush = (): void => {
                    const hasContent = run.some((n) => n.type !== 'text' || n.value?.trim())
                    if (hasContent) parts.push({ type: 'paragraph', children: run })
                    run = []
                }
                for (const child of node.children) {
                    if (isBlock(child)) {
                        flush()
                        parts.push(child)
                    } else run.push(child)
                }
                flush()
                return parts
            }
            return [node]
        }

        const root = tree as unknown as Node
        root.children = root.children?.flatMap(convert)
    }
}
