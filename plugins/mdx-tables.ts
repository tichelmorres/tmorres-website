import type { Plugin } from 'vite'

/*
    A  Markdown  table cannot hold block content.  This lets the
    cells  of  a  table span several lines.  Newlines inside the
    table are ignored.

        | <Imagetic path="img/a.png" /> | `inline code` |
        |:---:|:---:|
        | ```js
        const a = 1;
        ``` | $$
        \sum_{k=1}^{n} k
        $$ |
        | <LaTeX block>
        {String.raw`x^2`}
        </LaTeX> | <Fontize size={0.5}>
        ~~~~~~text
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠤⣤⠢⠤⠤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠊⠉⠉⢒⠌⠈⠉⠉⠊⢧⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠤⢄⠀⠀⣮⠂⢀⠀⠀⡀⠀⠀⠀⠀⢠⠀⠹⠢⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣜⢢⠠⠤⢕⡵⠁⣴⠁⠀⢠⠁⠀⠀⢱⠀⠀⢣⡀⠹⠢⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⢣⡇⠀⠀⢠⠁⡸⠇⠀⠀⡌⠀⠀⠀⠀⡇⠀⡜⣱⢤⣳⢇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⢄⠈⠦⣀⡆⠀⣿⢠⡠⠤⡇⠀⠀⠀⠠⠆⠤⡃⡟⣮⡽⠸⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢉⡏⠀⢀⣽⢸⡀⠤⡇⠀⠀⠀⠀⠀⢀⠀⠱⡟⠉⡇⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢎⢿⠀⢸⡷⢺⣿⣿⠣⠀⠀⠀⠠⢾⣿⡗⠢⡇⠀⣷⡃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠊⡎⠘⠀⠸⠑⢌⢿⡟⠀⠀⠀⠀⠀⠘⣿⡣⠎⡁⠀⡇⢹⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡰⠁⠀⡇⢸⡀⠀⡄⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⡇⠀⡇⡀⢧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠇⠀⣠⢃⢸⡇⠀⡷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡸⠇⠀⠃⠇⢸⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡎⠀⢸⡙⠸⠸⡇⠀⠃⠑⢄⠀⠀⠀⠢⠔⠀⠀⣀⠔⢹⠀⢰⢀⣸⢈⡷⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⡞⠀⠀⠀⢷⡀⠱⡇⠀⢸⢰⠀⣉⣒⠤⣀⣀⠤⣺⢁⠀⡎⠀⢸⣸⣠⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠰⠁⠀⢀⡔⠉⠉⠉⠁⠇⢸⢤⣆⢱⠀⠉⠢⡰⠋⠀⠸⣰⡇⠀⡇⠀⠀⠈⠙⢦⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⣷⢸⠀⠈⠉⠉⡠⠬⣑⢖⠒⠋⠁⢻⢰⠀⠀⠀⠀⠀⢀⡷⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠓⡲⠖⠒⢤⣈⣸⠀⠀⠀⢸⢸⣂⢿⠈⡆⠀⢸⡆⢘⡠⠔⠚⠭⣉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠊⠀⠀⠀⡘⠀⣿⠑⠂⢤⢀⣉⣈⡡⠮⡤⠄⢺⠋⡈⠀⠀⠀⠀⠀⠱⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠁⠀⠀⠀⠀⠃⠀⡻⠀⠀⠘⠢⡸⡜⠒⢢⠇⠀⠎⠀⢣⠀⠀⠀⠀⠀⠀⢳⠀⠀⠀⠀⠀⠀⠀
        ~~~~~~
        </Fontize> |

    Tables  that have a cell on more than one line are rewritten
    by  this plugin.  Otherwise, or if a table cannot be parsed,
    it is left to remark-gfm.
*/

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const ROW_START = /^ {0,3}\|/
const DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const BLANK_LINE = /[ \t]*(?:\n|$)/y
const END_OF_LINE = /[ \t]*(?:\n|$)/y

type Align = 'left' | 'center' | 'right' | null

interface Row {
    cells: string[]
    end: number
    multiline: boolean
}

interface Table {
    header: string[]
    aligns: Align[]
    rows: string[][]
    end: number
}

function matchesAt(pattern: RegExp, text: string, index: number): boolean {
    pattern.lastIndex = index
    return pattern.test(text)
}

// "a\nb" -> 'a'
function lineAt(text: string, index: number): string {
    const end = text.indexOf('\n', index)
    return text.slice(index, end === -1 ? text.length : end)
}

// ----------------------------------------------------------------------
//  Scanning
// ----------------------------------------------------------------------

// `src[start]` is a quote. Returns the index of the closing one, or -1.
function skipString(src: string, start: number): number {
    const quote = src[start]
    for (let i = start + 1; i < src.length; i++) {
        const char = src[i]
        if (char === '\\') i++
        else if (char === quote) return i
        else if (char === '\n') return -1
    }
    return -1
}

// `src[start]` is a backtick. Returns the index of the closing one, or -1.
function skipTemplate(src: string, start: number): number {
    for (let i = start + 1; i < src.length; i++) {
        const char = src[i]
        if (char === '\\') i++
        else if (char === '`') return i
        else if (char === '$' && src[i + 1] === '{') {
            const end = skipExpression(src, i + 1)
            if (end === -1) return -1
            i = end - 1
        }
    }
    return -1
}

// `src[start]` is a `{`. Returns the index right after the matching `}`, or -1.
function skipExpression(src: string, start: number): number {
    let depth = 0
    for (let i = start; i < src.length; i++) {
        const char = src[i]
        if (char === '"' || char === "'") {
            i = skipString(src, i)
            if (i === -1) return -1
        } else if (char === '`') {
            i = skipTemplate(src, i)
            if (i === -1) return -1
        } else if (char === '{') {
            depth++
        } else if (char === '}') {
            depth--
            if (depth === 0) return i + 1
        }
    }
    return -1
}

/*
    `src[start]`  is  a  `<`.  Returns the index right after the
    `>`  of the JSX tag, or -1 if it is not one (e.g.  `a < b`).
*/
function skipTag(src: string, start: number): number {
    const head = /<\/?(?:[A-Za-z][\w.:-]*)?/y
    head.lastIndex = start
    const match = head.exec(src)
    if (!match) return -1

    const hasName = match[0].replace(/^<\/?/, '') !== ''
    if (!hasName && src[head.lastIndex] !== '>') return -1

    for (let i = head.lastIndex; i < src.length; i++) {
        const char = src[i]
        if (char === '"' || char === "'") {
            // JSX attribute strings may span lines and have no escapes
            i = src.indexOf(char, i + 1)
            if (i === -1) return -1
        } else if (char === '{') {
            const end = skipExpression(src, i)
            if (end === -1) return -1
            i = end - 1
        } else if (char === '>') {
            return i + 1
        } else if (char === '<') {
            return -1
        }
    }
    return -1
}

// the run of `char` that starts at `start`
function runLength(src: string, start: number): number {
    let end = start
    while (src[end] === src[start]) end++
    return end - start
}

/*
    Returns  the  index  right  after  the  next  run of EXACTLY
    `length` times `char` (backticks or dollars), or -1.
*/
function findClosingRun(src: string, from: number, char: string, length: number, stopAtBlank: boolean): number {
    for (let i = from; i < src.length; ) {
        if (src[i] === '\n' && stopAtBlank && matchesAt(BLANK_LINE, src, i + 1)) return -1
        if (src[i] === char) {
            const run = runLength(src, i)
            if (run === length) return i + run
            i += run
        } else {
            i++
        }
    }
    return -1
}

// ----------------------------------------------------------------------
//  Rows and tables
// ----------------------------------------------------------------------

/*
    Is  there  a  fence that opens at `index`?  It has to be the
    first  thing  of its line or of its cell.  Returns the index
    right  after  the marks that close it.  What follows them on
    that line (`| next cell`) is read as usual.
*/
function readFence(src: string, index: number, cellStart: number): number | null {
    const lineStart = src.lastIndexOf('\n', index - 1) + 1
    const from = Math.max(lineStart, cellStart)
    const before = src.slice(from, index)
    if (!/^[ \t]*$/.test(before)) return null
    if (from === lineStart && before.length > 3) return null

    const char = src[index]
    const length = runLength(src, index)
    if (length < 3) return null

    const infoEnd = src.indexOf('\n', index)
    if (infoEnd === -1) return null
    // the info string of a backtick fence can not have a backtick
    if (char === '`' && src.slice(index + length, infoEnd).includes('`')) return null

    const closing = new RegExp(`^ {0,3}${char === '`' ? '`' : '~'}{${length},}`)
    for (let lineBegin = infoEnd + 1; lineBegin < src.length; ) {
        const line = lineAt(src, lineBegin)
        const found = closing.exec(line)
        if (found && /^[ \t]*(?:\||$)/.test(line.slice(found[0].length))) {
            return lineBegin + found[0].length
        }
        lineBegin += line.length + 1
    }
    return null
}

/*
    Reads  the row that starts at `start`.  Returns `null` if it
    is not closed.
*/
function parseRow(src: string, start: number): Row | null {
    const cells: string[] = []
    // `\|` in inline code is a `|`
    const unescape: number[] = []

    const take = (from: number, to: number): string => {
        let text = ''
        let last = from
        for (const index of unescape) {
            if (index < from || index >= to) continue
            text += src.slice(last, index)
            last = index + 1
        }
        return (text + src.slice(last, to)).trim()
    }

    let i = src.indexOf('|', start) + 1
    let cellStart = i

    while (i < src.length) {
        const char = src[i]

        if (char === '\\') {
            // an escaped newline is a line break
            i += src[i + 1] === '\n' ? 1 : 2
        } else if (char === '\n') {
            // a blank line ends the table, so the row was not closed
            if (matchesAt(BLANK_LINE, src, i + 1)) return null
            i++
        } else if (char === '`' || char === '~') {
            const fenceEnd = readFence(src, i, cellStart)
            if (fenceEnd !== null) {
                i = fenceEnd
            } else if (char === '`') {
                const length = runLength(src, i)
                const close = findClosingRun(src, i + length, '`', length, true)
                if (close === -1) {
                    i += length
                } else {
                    for (let j = i + length; j < close - length - 1; j++) {
                        if (src[j] === '\\' && src[j + 1] === '|') unescape.push(j)
                    }
                    i = close
                }
            } else {
                i += runLength(src, i)
            }
        } else if (char === '$') {
            const length = runLength(src, i)
            const close = findClosingRun(src, i + length, '$', length, length === 1)
            i = close === -1 ? i + length : close
        } else if (char === '<') {
            const end = skipTag(src, i)
            i = end === -1 ? i + 1 : end
        } else if (char === '{') {
            const end = skipExpression(src, i)
            i = end === -1 ? i + 1 : end
        } else if (char === '|') {
            cells.push(take(cellStart, i))
            i++
            // a `|` which ends its line closes the row
            END_OF_LINE.lastIndex = i
            if (END_OF_LINE.test(src)) {
                const newline = src.indexOf('\n', i)
                const end = newline === -1 ? src.length : newline + 1
                return { cells, end, multiline: src.slice(start, end).trimEnd().includes('\n') }
            }
            cellStart = i
        } else {
            i++
        }
    }
    return null
}

function parseAligns(line: string): Align[] {
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
    return cells.map((cell) => {
        const text = cell.trim()
        const left = text.startsWith(':')
        const right = text.endsWith(':')
        return left && right ? 'center' : right ? 'right' : left ? 'left' : null
    })
}

/*
    Reads the table that starts at `start`.  `multiline` says if
    it has to be rewritten.  Returns `null` if it is not a table
    or if it is a table made only of single lines.
*/
function parseTable(src: string, start: number): Table | null {
    const header = parseRow(src, start)
    if (!header || header.end >= src.length) return null

    const delimiter = lineAt(src, header.end)
    if (!delimiter.includes('|') || !DELIMITER_ROW.test(delimiter)) return null
    const aligns = parseAligns(delimiter)
    if (aligns.length !== header.cells.length) return null

    const columns = header.cells.length
    const rows: string[][] = []
    let multiline = header.multiline
    let end = Math.min(header.end + delimiter.length + 1, src.length)

    while (end < src.length && ROW_START.test(lineAt(src, end))) {
        const row = parseRow(src, end)
        if (!row) return null
        multiline ||= row.multiline
        // as in GFM: extra cells are dropped, missing ones are empty
        rows.push(Array.from({ length: columns }, (_, index) => row.cells[index] ?? ''))
        end = row.end
    }

    return multiline ? { header: header.cells, aligns, rows, end } : null
}

function renderCell(tag: 'th' | 'td', content: string, align: Align): string {
    const name = tag === 'th' ? 'Th' : 'Td'
    const attributes = align ? ` align="${align}"` : ''
    if (content === '') return `<${name}${attributes} />`
    return `<${name}${attributes}>\n\n${content}\n\n</${name}>`
}

function renderTable({ header, aligns, rows }: Table): string {
    const renderRow = (tag: 'th' | 'td', cells: string[]): string =>
        `<tr>\n${cells.map((cell, index) => renderCell(tag, cell, aligns[index])).join('\n')}\n</tr>`

    const parts = ['<Table>', '<thead>', renderRow('th', header), '</thead>']
    if (rows.length > 0) {
        parts.push('<tbody>', ...rows.map((row) => renderRow('td', row)), '</tbody>')
    }
    parts.push('</Table>')
    return `${parts.join('\n')}\n`
}

export function expandTables(source: string): string {
    if (!source.includes('|')) return source

    const eol = source.includes('\r\n') ? '\r\n' : '\n'
    const src = eol === '\r\n' ? source.replace(/\r\n/g, '\n') : source

    let out = ''
    let changed = false
    let fence: string | null = null
    let position = 0

    while (position < src.length) {
        const newline = src.indexOf('\n', position)
        const lineEnd = newline === -1 ? src.length : newline + 1
        const line = src.slice(position, newline === -1 ? src.length : newline)

        const marker = FENCE.exec(line)?.[1]
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null
        } else if (marker) {
            fence = marker
        } else if (ROW_START.test(line)) {
            const table = parseTable(src, position)
            if (table) {
                // a block has to be surrounded by blank lines
                if (out !== '' && !out.endsWith('\n\n')) out += '\n'
                out += renderTable(table)
                if (table.end < src.length && src[table.end] !== '\n') out += '\n'
                position = table.end
                changed = true
                continue
            }
        }

        out += src.slice(position, lineEnd)
        position = lineEnd
    }

    if (!changed) return source
    return eol === '\r\n' ? out.replace(/\n/g, '\r\n') : out
}

export default function mdxTables(): Plugin {
    return {
        name: 'mdx-tables',
        enforce: 'pre',
        transform(code, id) {
            if (!id.split('?')[0].endsWith('.mdx')) return null
            const result = expandTables(code)
            return result === code ? null : { code: result, map: null }
        },
    }
}
