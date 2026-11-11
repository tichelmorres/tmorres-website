import type { Root } from 'mdast'
import { typographicDashes } from '../src/lib/dashes.ts'

/*
    Turns  inline  `---` into an em dash and inline `--` into an
    en dash in the text of the page.

    Links,  code  and  math  in  general  are  left  as is.  JSX
    attributes are not touched either.
*/

interface Node {
    type      : string
    name     ?: string | null
    value    ?: string
    url      ?: string
    children? : Node[]
}

const SKIP_TYPES = new Set(['code', 'inlineCode', 'math', 'inlineMath', 'mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'])
const SKIP_COMPONENTS = new Set(['LaTeX', 'Code'])

function convert(node: Node): void {
    if (SKIP_TYPES.has(node.type)) return
    if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        node.name != null &&
        SKIP_COMPONENTS.has(node.name)
    ) return

    // [https://a--b.com](https://a--b.com) or an autolink
    if (
        node.type === 'link' &&
        node.children?.length === 1 &&
        node.children[0].type === 'text' &&
        node.children[0].value === node.url
    ) return

    if (node.type === 'text' && typeof node.value === 'string') {
        node.value = typographicDashes(node.value)
        return
    }

    for (const child of node.children ?? []) convert(child)
}

export default function remarkDashes() {
    return (tree: Root): void => {
        convert(tree as unknown as Node)
    }
}
