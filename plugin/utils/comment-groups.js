// Splits a file's comments into the units a reader treats as one comment: each
// /* */ block, each // comment that trails code, and each run of standalone //
// lines on consecutive lines, which reads as one paragraph.
export function getCommentGroups(sourceCode) {
  const comments = sourceCode.getAllComments();
  const groups = [];

  function isTrailing(comment) {
    const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: false });
    return Boolean(tokenBefore) && tokenBefore.loc.end.line === comment.loc.start.line;
  }

  for (let i = 0; i < comments.length; ) {
    const comment = comments[i];

    if (comment.type === 'Block' || isTrailing(comment)) {
      groups.push({
        kind: comment.type === 'Block' ? 'block' : 'trailing',
        comments: [comment],
        text: comment.value.trim(),
        loc: comment.loc,
      });
      i++;
      continue;
    }

    const run = [comment];
    let j = i + 1;
    while (j < comments.length) {
      const next = comments[j];
      if (
        next.type === 'Line' &&
        !isTrailing(next) &&
        next.loc.start.line === run[run.length - 1].loc.end.line + 1
      ) {
        run.push(next);
        j++;
      } else {
        break;
      }
    }

    groups.push({
      kind: 'run',
      comments: run,
      text: run.map((c) => c.value.trim()).join(' '),
      loc: { start: run[0].loc.start, end: run[run.length - 1].loc.end },
    });
    i = j;
  }

  return groups;
}
