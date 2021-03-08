const path = require('path');

function isDocsToolsResource(resourcePath) {
  return /(\/|\\)skyux-docs-tools(\/|\\)/.test(resourcePath);
}

function isPluginResource(resourcePath, fileNameRegex) {

  // Resolve the resource path for Windows machines.
  const resolvedPath = path.resolve(resourcePath);

  // Directory used when serving or building.
  const dir = path.join('src', 'app', 'public', 'plugin-resources');

  // Directory used when building library.
  const tempDir = path.join('.skypagestmp', 'plugin-resources');

  if (
    resolvedPath.indexOf(dir) === -1 &&
    resolvedPath.indexOf(tempDir) === -1
  ) {
    return false;
  }

  return fileNameRegex.test(resolvedPath);
}

function parseClassName(content) {
  return content
    .split('export class ')[1]
    .split(' ')[0];
}

/**
 * Wrapping require.resolve to make it easier to mock during unit tests.
 * (It's dangerous to mock the `require` methods.)
 * See: https://github.com/thlorenz/proxyquire/issues/77#issuecomment-406365452
 */
function resolveModule(packageName) {
  return require.resolve(packageName);
}

module.exports = {
  isDocsToolsResource,
  isPluginResource,
  parseClassName,
  resolveModule
};
