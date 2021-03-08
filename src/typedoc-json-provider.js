const fs = require('fs-extra');
const path = require('path');

const utils = require('./utils');

const { outputDir } = require('./documentation-generator');

function getDocumentationConfig() {
  const filePath = path.resolve(`${outputDir}/documentation.json`);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readJsonSync(filePath, {
    encoding: 'utf8'
  });
}

/**
 * Writes the contents of TypeDoc JSON file to an Angular provider.
 * @param {string} content
 */
function writeTypeDefinitionsProvider(content, docsToolsImportPath) {

  const jsonContent = getDocumentationConfig();
  const className = utils.parseClassName(content);

  return `import {
  Injectable
} from '@angular/core';

import {
  SkyDocsTypeDefinitionsProvider
} from '${docsToolsImportPath}';

@Injectable()
export class ${className} implements SkyDocsTypeDefinitionsProvider {
  public readonly anchorIds: {[_: string]: string} = ${JSON.stringify(jsonContent.anchorIds)};
  public readonly typeDefinitions: any[] = ${JSON.stringify(jsonContent.children)};
}
`;
}

function preload(content, resourcePath) {

  if (!utils.isPluginResource(
    resourcePath,
    /(-type-definitions-provider.ts)$/
  )) {
    return content;
  }

  let modified = content.toString();

  const docsToolsImportPath = utils.isDocsToolsResource(resourcePath)
    ? './public/public_api'
    : '@skyux/docs-tools';

  modified = writeTypeDefinitionsProvider(modified, docsToolsImportPath);

  return Buffer.from(modified, 'utf8');
}

module.exports = {
  getDocumentationConfig,
  preload
};
