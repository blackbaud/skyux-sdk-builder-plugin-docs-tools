const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const utils = require('./utils');

/**
 * Reads the raw contents of any project files located in `./src/app/public/plugin-resources/code-examples`.
 */
function getCodeExamplesSourceCode() {
  const results = glob.sync(
    path.join(
      'src/app/public/plugin-resources/code-examples',
      '**',
      '*.{ts,js,html,scss}'
    )
  );

  const sourceCode = results.map((filePath) => {
    let rawContents = fs.readFileSync(
      filePath,
      { encoding: 'utf8' }
    ).toString();

    // Use encoding to prevent certain webpack plugins and
    // loaders from manipulating the content.
    // (Specifically, `angular2-template-loader` will add `require`
    // statements to template and style URLs in the `@Component` decorator.)
    rawContents = encodeURIComponent(rawContents);

    const fileName = path.basename(filePath);

    return {
      fileName,
      filePath,
      rawContents
    };
  });

  return JSON.stringify(sourceCode, undefined, 2);
}

function writeSourceCodeProvider(content, docsToolsImportPath) {
  const formattedSourceCode = getCodeExamplesSourceCode();
  const className = utils.parseClassName(content);

  return `import {
  Injectable
} from '@angular/core';

import {
  SkyDocsSourceCodeProvider
} from '${docsToolsImportPath}';

@Injectable()
export class ${className} implements SkyDocsSourceCodeProvider {
  public readonly sourceCode: any[] = ${formattedSourceCode};
}
`;
}

function preload(content, resourcePath) {

  if (!utils.isPluginResource(
    resourcePath,
    /(-source-code-provider.ts)$/
  )) {
    return content;
  }

  let modified = content.toString();

  const docsToolsImportPath = utils.isDocsToolsResource(resourcePath)
    ? './public/public_api'
    : '@skyux/docs-tools';

  modified = writeSourceCodeProvider(modified, docsToolsImportPath);

  return Buffer.from(modified, 'utf8');
}

module.exports = {
  getCodeExamplesSourceCode,
  preload
};
