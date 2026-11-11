import type { Plugin } from 'vite'

/*
    `export  const metadata` is plain JavaScript.  So that LaTeX
    can  be  written  as  is,  a backslash inside the "..."  and
    '...'   strings  of  the  metadata  is  kept  as  a  literal
    backslash:

        "$\pi$" "$\theta$"  ->  the backslash is kept
*/

const START = /^export\s+const\s+metadata\s*=/m

export function rawMetadata(source: string): string {
    const start = START.exec(source)
    if (!start) return source

    let i = start.index + start[0].length
    while (i < source.length && /\s/.test(source[i])) i++
    if (source[i] !== '{') return source

    let out = source.slice(0, i)
    let depth = 0

    for (; i < source.length; i++) {
        const char = source[i]

        if (char === '"' || char === "'") {
            out += char
            for (i++; i < source.length && source[i] !== char && source[i] !== '\n'; i++) {
                if (source[i] === '\\') {
                    const next = source[i + 1]
                    if (next === '\\' || next === char) {
                        out += source[i] + next
                        i++
                    } else {
                        out += '\\\\'
                    }
                } else {
                    out += source[i]
                }
            }
            if (i < source.length) out += source[i]
            continue
        }

        if (char === '`') {
            out += char
            for (i++; i < source.length && source[i] !== '`'; i++) {
                if (source[i] === '\\') out += source[i++]
                out += source[i] ?? ''
            }
            if (i < source.length) out += source[i]
            continue
        }

        out += char
        if (char === '{') depth++
        else if (char === '}' && --depth === 0) return out + source.slice(i + 1)
    }
    return source
}

export default function mdxMetadataRaw(): Plugin {
    return {
        name: 'mdx-metadata-raw',
        enforce: 'pre',
        transform(code, id) {
            if (!id.split('?')[0].endsWith('.mdx')) return null
            const result = rawMetadata(code)
            return result === code ? null : { code: result, map: null }
        },
    }
}
