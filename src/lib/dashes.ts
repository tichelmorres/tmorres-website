/*
    Typographic dashes, shared by the build (plugins/remark-dashes.ts,
    plugins/mdx-text.ts) and the browser (metadata, see RichText).

        ---   ->  em dash
        --    ->  en dash
*/
export function typographicDashes(text: string): string {
    return text.replace(/-{3}/g, '\u2014').replace(/-{2}/g, '\u2013')
}
