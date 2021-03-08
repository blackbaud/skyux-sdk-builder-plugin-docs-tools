const logger = require('@blackbaud/skyux-logger');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const TypeDoc = require('typedoc');

const outputDir = '.skypagestmp/docs';

function removeDocumentationFiles() {
  rimraf.sync(outputDir);
}

function parseFriendlyUrlFragment(value) {
  if (!value) {
    return;
  }

  const friendly = value.toLowerCase()

    // Remove special characters.
    .replace(/[_~`@!#$%^&*()[\]{};:'/\\<>,.?=+|"]/g, '')

    // Replace space characters with a dash.
    .replace(/\s/g, '-')

    // Remove any double-dashes.
    .replace(/--/g, '-');

  return friendly;
}

/**
 * Some types (read: List Builder) extend third-party types found in `node_modules`.
 * We should remove them because TypeDoc pulls in all of the third-party's properties into our documentation.
 * @example ```
 *   export interface MyState extends Subject {}
 * ```
 */
function removeNodeModulesMembers(project) {
  project.children.forEach((child) => {
    if (child.children) {
      child.children = child.children.filter((c) => {
        return (!/node_modules/.test(c.sources[0].fileName));
      });
    }
  });
}

function generateDocumentationFiles() {
  logger.info('Generating documentation...');

  const app = new TypeDoc.Application();

  // Read options from project's tsconfig.json file.
  app.options.addReader(new TypeDoc.TSConfigReader());

  app.bootstrap({
    exclude: [
      '**/node_modules/**',
      '**/fixtures/**',
      '**/*.spec.ts',
      '**/plugin-resources/**'
    ],
    excludeExternals: true,
    excludeNotExported: true,
    excludePrivate: true,
    excludeProtected: true,
    experimentalDecorators: true,
    logger: 'none',
    mode: 'file',
    module: 'CommonJS',
    stripInternal: true,
    target: 'ES5'
  });

  const project = app.convert(
    app.expandInputFiles([
      'src/app/public'
    ])
  );

  if (project) {
    removeDocumentationFiles();
    removeNodeModulesMembers(project);

    const jsonPath = `${outputDir}/documentation.json`;
    app.generateJson(project, jsonPath);
    const jsonContents = fs.readJsonSync(jsonPath);

    // Create anchor IDs to be used for same-page linking.
    const anchorIdMap = {};
    jsonContents.children
      .filter((child) => {
        const kindString = child.kindString.toLowerCase();
        switch (kindString) {
          default:
            return true;
          // Do not generate anchor IDs for the following types:
          case 'variable':
            return false;
        }
      })
      .forEach((child) => {
        const kindString = parseFriendlyUrlFragment(child.kindString);
        const friendlyName = parseFriendlyUrlFragment(child.name);
        const anchorId = `${kindString}-${friendlyName}`;

        child.anchorId = anchorId;
        anchorIdMap[child.name] = anchorId;
      });

    jsonContents.anchorIds = anchorIdMap;

    fs.writeJsonSync(jsonPath, jsonContents);

    logger.info('Done.');
  } else {
    throw new Error('TypeDoc project generation failed. This usually occurs when the underlying TypeScript project does not compile or is invalid. Try running `skyux build` to list any compiler issues.');
  }

  process.on('exit', () => {
    removeDocumentationFiles();
  });

  process.on('SIGINT', () => {
    process.exit();
  });
}

module.exports = {
  generateDocumentationFiles,
  outputDir
};
