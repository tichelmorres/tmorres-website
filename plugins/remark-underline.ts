import type { Processor } from 'unified'
import type {
    Event,
    Extension as MicromarkExtension,
    State,
    Token,
    TokenizeContext,
    Tokenizer,
} from 'micromark-util-types'
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import { splice } from 'micromark-util-chunked'
import { classifyCharacter } from 'micromark-util-classify-character'
import { resolveAll } from 'micromark-util-resolve-all'

/*
    Adds an underline operator to Markdown.

        ++underlined++      ->  <u>underlined</u>

    It  is built the same way as the strikethrough of remark-gfm
    (a micromark syntax extension).
*/

const PLUS = 43

// teaches TypeScript the token names of this syntax
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        underline: 'underline'
        underlineSequence: 'underlineSequence'
        underlineSequenceTemporary: 'underlineSequenceTemporary'
        underlineText: 'underlineText'
    }
}

// micromark keeps these on the temporary token, but does not type them
type SequenceToken = Token & { _open?: boolean; _close?: boolean }

// `++text++`  ->  `underline`, `underlineSequence`, `underlineText`
function underlineSyntax(): MicromarkExtension {
    const tokenizer = {
        name: 'underline',
        tokenize: tokenizeUnderline,
        resolveAll: resolveAllUnderline,
    }

    return {
        text: { [PLUS]: tokenizer },
        insideSpan: { null: [tokenizer] },
        // so that `*`, `_` and `~` next to `+` are classified correctly
        attentionMarkers: { null: [PLUS] },
    }

    // pairs the `++` that can close with the nearest `++` before them that can open
    function resolveAllUnderline(events: Event[], context: TokenizeContext): Event[] {
        let index = -1

        while (++index < events.length) {
            const closer = events[index][1] as SequenceToken
            if (events[index][0] !== 'enter' || closer.type !== 'underlineSequenceTemporary' || !closer._close) continue

            let open = index
            while (open--) {
                const opener = events[open][1] as SequenceToken
                if (events[open][0] !== 'exit' || opener.type !== 'underlineSequenceTemporary' || !opener._open) continue

                closer.type = 'underlineSequence'
                opener.type = 'underlineSequence'

                const underline: Token = {
                    type: 'underline',
                    start: Object.assign({}, opener.start),
                    end: Object.assign({}, closer.end),
                }
                const text: Token = {
                    type: 'underlineText',
                    start: Object.assign({}, opener.end),
                    end: Object.assign({}, closer.start),
                }

                const next: Event[] = [
                    ['enter', underline, context],
                    ['enter', opener, context],
                    ['exit', opener, context],
                    ['enter', text, context],
                ]

                // the in between is resolved inside
                const insideSpan = context.parser.constructs.insideSpan.null
                if (insideSpan) {
                    splice(next, next.length, 0, resolveAll(insideSpan, events.slice(open + 1, index), context))
                }

                splice(next, next.length, 0, [
                    ['exit', text, context],
                    ['enter', closer, context],
                    ['exit', closer, context],
                    ['exit', underline, context],
                ])

                splice(events, open - 1, index - open + 3, next)
                index = open + next.length - 2
                break
            }
        }

        // `++` is plain text if no partner was found
        index = -1
        while (++index < events.length) {
            if (events[index][1].type === 'underlineSequenceTemporary') events[index][1].type = 'data'
        }

        return events
    }

    function tokenizeUnderline(this: TokenizeContext, effects: Parameters<Tokenizer>[0], ok: State, nok: State): State {
        const previous = this.previous
        const events = this.events
        let size = 0

        return start

        function start(code: number | null): State | undefined {
            // not inside a longer run (`+++`), unless the first `+` was escaped
            if (previous === PLUS && events[events.length - 1][1].type !== 'characterEscape') return nok(code)
            effects.enter('underlineSequenceTemporary')
            return more(code)
        }

        function more(code: number | null): State | undefined {
            const before = classifyCharacter(previous)

            if (code === PLUS) {
                // a third `+`
                if (size > 1) return nok(code)
                effects.consume(code)
                size++
                return more
            }

            // a single `+`
            if (size < 2) return nok(code)

            const token = effects.exit('underlineSequenceTemporary') as SequenceToken
            const after = classifyCharacter(code)
            token._open = !after || (after === 2 && Boolean(before))
            token._close = !before || (before === 2 && Boolean(after))
            return ok(code)
        }
    }
}

// `underline`  ->  { type: 'underline', children }
function underlineFromMarkdown(): FromMarkdownExtension {
    return {
        // without this, line breaks would be lost inside
        canContainEols: ['underline'],
        enter: {
            underline(this: CompileContext, token) {
                this.enter({ type: 'underline', children: [], data: { hName: 'u' } } as never, token)
            },
        },
        exit: {
            underline(this: CompileContext, token) {
                this.exit(token)
            },
        },
    }
}

export default function remarkUnderline(this: Processor): void {
    const data = this.data() as {
        micromarkExtensions?: MicromarkExtension[]
        fromMarkdownExtensions?: FromMarkdownExtension[]
    }

    const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = [])
    const fromMarkdownExtensions = data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = [])

    micromarkExtensions.push(underlineSyntax())
    fromMarkdownExtensions.push(underlineFromMarkdown())
}
