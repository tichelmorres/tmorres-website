/*
    Turns  the  source  of  an  MDX  file  into the plain text a
    visitor  reads,  to be searched (see `virtual:mdx-search` in
    mdx-pages.ts).   It  is a limited MDX parser, enough for the
    search mechanism.
*/

import { expandTables } from './mdx-tables.ts'
import { typographicDashes } from '../src/lib/dashes.ts'

const OPEN = '\uE000'
const CLOSE = '\uE001'
const PLACEHOLDER = new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g')

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const INLINE_CODE = /(`+)([\s\S]*?[^`])\1(?!`)/g

// {String.raw`...`} or {`...`}
const TEMPLATE_LITERAL = /\{\s*(?:String\.raw)?`([^`]*)`\s*\}/g

// a JSX tag. Quoted values and {expressions} may contain `>` (srcDoc="<body>...")
const TAG = /<\/?[A-Za-z][\w.:-]*(?:"[^"]*"|'[^']*'|\{[^{}]*\}|[^>"'{])*>/g
const DESC_ATTRIBUTE = /\bdesc\s*=\s*(?:"([^"]*)"|'([^']*)')/

const ENTITIES: Record<string, string> = {
    '&amp;'  : '&',
    '&lt;'   : '<',
    '&gt;'   : '>',
    '&quot;' : '"',
    '&#39;'  : "'",
    '&nbsp;' : ' ',
}

// Replaces code with placeholders. Returns the rest and the code that was taken out.
function protectCode(source: string): { text: string; code: string[] } {
    const code: string[] = []
    const keep = (content: string): string => `${OPEN}${code.push(content) - 1}${CLOSE}`

    const lines: string[] = []
    let fence: string | null = null
    let block: string[] = []
    for (const line of source.split(/\r?\n/)) {
        const marker = FENCE.exec(line)?.[1]
        if (fence === null) {
            if (marker) {
                fence = marker
                block = []
            } else {
                lines.push(line)
            }
        } else if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
            lines.push(keep(block.join('\n')))
            fence = null
        } else {
            block.push(line)
        }
    }
    if (fence !== null) lines.push(keep(block.join('\n')))

    const text = lines
        .join('\n')
        .replace(TEMPLATE_LITERAL, (_match, content: string) => keep(content))
        .replace(INLINE_CODE, (_match, _ticks, content: string) => keep(content.trim()))
    return { text, code }
}

// Removes `import ...` / `export ...` statements
function dropEsm(text: string): string {
    let result = ''
    let i = 0
    let atLineStart = true

    while (i < text.length) {
        if (atLineStart && /^(import|export)\s/.test(text.slice(i, i + 8))) {
            let depth = 0
            let quote: string | null = null
            for (; i < text.length; i++) {
                const char = text[i]
                if (quote !== null) {
                    if (char === '\\') i++
                    else if (char === quote) quote = null
                } else if (char === '"' || char === "'" || char === '`') {
                    quote = char
                } else if (char === '(' || char === '[' || char === '{') {
                    depth++
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--
                } else if (char === '\n' && depth <= 0) {
                    break
                }
            }
            continue
        }
        result += text[i]
        atLineStart = text[i] === '\n'
        i++
    }
    return result
}

function dropExpressions(text: string): string {
    let previous: string
    do {
        previous = text
        text = text.replace(/\{[^{}]*\}/g, '')
    } while (text !== previous)
    return text
}

function dropMarkdown(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
        .replace(/^[ \t]*>[ \t]?/gm, '')
        .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, '')
        .replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+/gm, '')
        .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, '')
        .replace(/\|/g, ' ')
        .replace(/(\*\*|~~|\+\+)(?=\S)([\s\S]*?\S)\1/g, '$2')
        .replace(/\*(?=\S)([^*]*?\S)\*/g, '$1')
        .replace(/(?<!\w)(__?)(?=\S)([^_]*?\S)\1(?!\w)/g, '$2')
}

export function mdxToText(source: string): string {
    // multi-line table cells become plain blocks first (see mdx-tables.ts)
    const { text: unprotected, code } = protectCode(expandTables(source))

    let text = dropEsm(unprotected)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(TAG, (tag) => {
            const match = DESC_ATTRIBUTE.exec(tag)
            const desc = match?.[1] ?? match?.[2]
            // <b>a</b>b stays "ab"
            const separator = tag.endsWith('/>') ? ' ' : ''
            return desc !== undefined && desc !== 'ref' ? ` ${desc} ` : separator
        })

    text = dropMarkdown(dropExpressions(text))
        .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])

    // dashes before the code comes back, so code keeps its `--`
    return typographicDashes(text)
        .replace(PLACEHOLDER, (_match, index: string) => code[Number(index)])
        .replace(/\s+/g, ' ')
        .trim()
}
