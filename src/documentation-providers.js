const sourceCodeProviderPlugin = require('./source-code-provider');
const typeDocJsonProvider = require('./typedoc-json-provider');
const utils = require('./utils');

function preload(content, resourcePath) {
  if (resourcePath.indexOf('app-extras.module.ts') === -1) {
    return content;
  }

  let modified = content.toString();

  // Don't modify the module if the user adds providers manually.
  const hasSourceCodeProvider = /SkyDocsSourceCodeProvider/.test(modified);
  const hasTypeDocJsonProvider = /SkyDocsTypeDefinitionsProvider/.test(modified);
  if (hasSourceCodeProvider && hasTypeDocJsonProvider) {
    return content;
  }

  const imports = [];
  const providerConfigs = [];
  let providerOverrides = '';

  if (!hasSourceCodeProvider) {
    const codeExamplesSourceCode = sourceCodeProviderPlugin.getCodeExamplesSourceCode();
    imports.push('SkyDocsSourceCodeProvider');
    providerConfigs.push(`    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    }`);
    providerOverrides += `export class SkyDocsSourceCodeImplService {
  public readonly sourceCode: any[] = ${codeExamplesSourceCode};
}

`;
  }

  if (!hasTypeDocJsonProvider) {
    const documentationConfig = typeDocJsonProvider.getDocumentationConfig();
    imports.push('SkyDocsTypeDefinitionsProvider');
    providerConfigs.push(`    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }`);
    providerOverrides += `export class SkyDocsTypeDefinitionsImplService {
  public readonly anchorIds: {[_: string]: string} = ${JSON.stringify(documentationConfig.anchorIds)};
  public readonly typeDefinitions: any[] = ${JSON.stringify(documentationConfig.children)};
}

`;
  }

  // Modify the `providers` array for AppExtrasModule.
  const ngModuleMatches = modified.match(/@NgModule\s*\([\s\S]+\)/g);
  let ngModuleSource = ngModuleMatches[0];
  const providersMatches = ngModuleSource.match(/(providers\s*:\s*\[[\s\S]*\])/g);
  let providersSource;
  if (providersMatches) {
    providersSource = providersMatches[0];
  } else {
    const ngModuleSourceStart = ngModuleSource.substr(0, ngModuleSource.indexOf('{') + 1);
    const ngModuleSourceEnd = ngModuleSource.substr(ngModuleSourceStart.length);
    const hasOtherModuleProps = ngModuleSourceEnd.replace(/\s/g, '') !== '})';
    providersSource = `
  providers: []${hasOtherModuleProps ? ',' : '\n'}`;
    ngModuleSource = ngModuleSource.replace(ngModuleSourceStart, ngModuleSourceStart + providersSource);
  }

  // Apply any changes.
  const providersSourceStart = providersSource.substr(0, providersSource.indexOf('[') + 1);
  const providersSourceEnd = providersSource.substring(providersSourceStart.length, providersSource.indexOf(']') + 1);
  ngModuleSource = ngModuleSource.replace(
    providersSourceStart,
    providersSourceStart + `
${providerConfigs.join(',\n')}${providersSourceEnd === ']' ? '\n  ' : ','}`
  );
  modified = modified.replace(ngModuleMatches[0], ngModuleSource);

  // Use a local path if executed within `blackbaud/skyux-docs-tools` source code.
  const docsToolsImportPath = utils.isDocsToolsResource(resourcePath)
    ? './public/public_api'
    : '@skyux/docs-tools';

  // Add provider imports and service overrides.
  modified = `
import {
  ${imports.join(',\n  ')}
} from '${docsToolsImportPath}';

${providerOverrides}${modified}
`;

  return Buffer.from(modified, 'utf8');
}

module.exports = {
  preload
};
