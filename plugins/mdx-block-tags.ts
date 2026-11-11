import type { Plugin } from 'vite'

/*
    MDX  only  accepts a block component whose tags are on lines
    of  their  own.   Text on the same line as the tag, when the
    component spans several lines, is a parse error, e.g.

      <Align to="center">**bold**  <Align to="center">
      </Align>                     **bold**</Align>

    This  moves  the  text away from the tags, so every spelling
    above is accepted:

      <Align to="center">  <Align to="center">**bold**</Align>
      **bold**
      </Align>

    The  opening  tag  can have attributes, as long as they have
    no `<` or `>` (a `{a > b}` expression would not be found).
*/

const BLOCK_TAGS = ['Align']

const FENCE = /^ {0,3}(`{3,}|~{3,})/

export function splitBlockTags(source: string, tags: string[] = BLOCK_TAGS): string {
    const names    = tags.join('|')
    const openTag  = `<(?:${names})(?:\\s+[^<>]*?[^<>/\\s])?\\s*>`
    const open     = new RegExp(`^(\\s*)(${openTag})(?=\\S)(.*)$`)
    const close    = new RegExp(`^(.*\\S)\\s*(<\\/(?:${names})\\s*>)\\s*$`)
    const anyOpen  = new RegExp(openTag)
    const anyClose = new RegExp(`<\\/(?:${names})\\s*>`)

    const eol = source.includes('\r\n') ? '\r\n' : '\n'

    let fence: string | null = null
    const out: string[] = []

    for (const line of source.split(/\r?\n/)) {
        const marker = FENCE.exec(line)?.[1]
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null
            out.push(line)
            continue
        }
        if (marker) {
            fence = marker
            out.push(line)
            continue
        }

        let current = line

        // <Align to="left">text   ->   <Align to="left"> + text
        const opening = open.exec(current)
        if (opening && !anyClose.test(opening[3])) {
            out.push(`${opening[1]}${opening[2]}`)
            current = `${opening[1]}${opening[3]}`
        }

        // text</Align>   ->   text + </Align>
        const closing = close.exec(current)
        if (closing && !anyOpen.test(closing[1])) {
            out.push(closing[1], closing[2])
            continue
        }

        out.push(current)
    }

    return out.join(eol)
}

export default function mdxBlockTags(): Plugin {
    return {
        name: 'mdx-block-tags',
        enforce: 'pre',
        transform(code, id) {
            if (!id.split('?')[0].endsWith('.mdx')) return null
            const result = splitBlockTags(code)
            return result === code ? null : { code: result, map: null }
        },
    }
}
