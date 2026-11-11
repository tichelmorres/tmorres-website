/*
    What <LaTeX> does NOT accept for equations.

    - images,  links  and  HTML
      \includegraphics, \href, \url, \html*

    - position  and  size  of  things
      \raisebox,   \rlap,  \llap,  \clap,  \mathrlap...,  \kern,
      \mkern,  \hskip, \mskip, \hspace, \vspace, \vcenter, \rule

    - diagrams
      \begin{CD}

    - monospaced fonts and small caps
      \tt,  \texttt,  \mathtt,  \ttfamily,  \verb, \sc,\scshape,
      \textsc...
      and Unicode monospace letters and digits
      (U+1D670 to U+1D6A3, U+1D7F6 to U+1D7FF)

    - equation tags
      \tag

    - definitions and tricks to build a command out of text
      \def, \let, \newcommand, \csname...
*/

const FORBIDDEN_COMMANDS: ReadonlySet<string> = new Set([
    // images, links, HTML
    'includegraphics',
    'href',
    'url',
    'htmlClass',
    'htmlId',
    'htmlStyle',
    'htmlData',
    // position and size
    'raisebox',
    'rlap',
    'llap',
    'clap',
    'mathrlap',
    'mathllap',
    'mathclap',
    'kern',
    'mkern',
    'hskip',
    'mskip',
    'hspace',
    'vspace',
    'vskip',
    'vcenter',
    'rule',
    // tags
    'tag',
    // definitions
    'def',
    'gdef',
    'edef',
    'xdef',
    'let',
    'futurelet',
    'newcommand',
    'renewcommand',
    'providecommand',
    'DeclareMathOperator',
    'global',
    'long',
    'outer',
    'csname',
    'endcsname',
    'expandafter',
    'noexpand',
    'char',
    '@char',
]);

const NO_MONOSPACE_OR_SMALL_CAPS: ReadonlySet<string> = new Set([
    'tt',
    'texttt',
    'mathtt',
    'ttfamily',
    'verb',
    'sc',
    'scshape',
    'textsc',
    'mathsc',
]);

// mathematical monospace letters (A-Z, a-z) and digits
const MONOSPACE_CHARACTERS = /[\u{1D670}-\u{1D6A3}\u{1D7F6}-\u{1D7FF}]/u;

const FORBIDDEN_ENVIRONMENTS: ReadonlySet<string> = new Set(['CD']);

// longest character input accepted
export const MAX_LENGTH = 5000;

const COMMAND = /\\([A-Za-z@]+)/g;
const ENVIRONMENT = /\\(?:begin|end)\s*\{\s*([^{}\s]+)\s*\}/g;

// what is wrong with the input, or null if it is accepted
export function checkLatex(tex: string): string | null {
    if (tex.length > MAX_LENGTH) return `the equation is longer than ${MAX_LENGTH} characters`;

    for (const [, name] of tex.matchAll(COMMAND)) {
        if (FORBIDDEN_COMMANDS.has(name)) return `\\${name} is not allowed`;
        if (NO_MONOSPACE_OR_SMALL_CAPS.has(name)) {
            return `\\${name} is not allowed: equations have no monospaced font and no small caps`;
        }
    }
    if (MONOSPACE_CHARACTERS.test(tex)) {
        return 'monospaced characters are not allowed: equations have no monospaced font';
    }
    for (const [, name] of tex.matchAll(ENVIRONMENT)) {
        if (FORBIDDEN_ENVIRONMENTS.has(name)) return `\\begin{${name}} is not allowed`;
    }
    return null;
}
