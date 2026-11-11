/*
    Complements  katex/contrib/copy-tex (see LaTeXRenderer.tsx),
    which  turns the copied equations back into TeX.

    copy-tex  only  knows  it  is  a  `block`  if  the selection
    includes the whole `.katex-display` box.  When the selection
    starts  or  ends  INSIDE  one, the pasted text would get the
    single `$` of an inline equation.  So, before copy-tex looks
    at the selection, it is widened to cover the whole displayed
    equation.
*/

function displayAround(node: Node): Element | null {
    const element = node instanceof Element ? node : node.parentElement;
    return element?.closest('.katex-display') ?? null;
}

function widenToDisplayEquations(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const first = displayAround(range.startContainer);
    const last = displayAround(range.endContainer);
    if (first) range.setStartBefore(first);
    if (last) range.setEndAfter(last);
}

document.addEventListener('copy', widenToDisplayEquations, true);
