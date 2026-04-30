module.exports = {
  hook: {
    prepareCommitMsg: 'husky commit-msg',
    preCommit: 'pnpm lint && pnpm format:check && pnpm type-check',
  },
};
