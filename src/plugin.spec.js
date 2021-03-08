const logger = require('@blackbaud/skyux-logger');
const mock = require('mock-require');

describe('Plugin', function () {
  let mockDocumentationGenerator;
  let mockDocumentationProviders;
  let mockSourceCodeProvider;
  let mockTypeDocJsonProvider;
  let utils;
  let warnSpy;

  beforeEach(() => {
    mockDocumentationGenerator = {
      generateDocumentationFiles() {}
    };
    mockDocumentationProviders = {
      preload: (content) => content
    };
    mockSourceCodeProvider = {
      preload: (content) => content
    };
    mockTypeDocJsonProvider = {
      preload: (content) => content
    };

    mock('./documentation-generator', mockDocumentationGenerator);
    mock('./documentation-providers', mockDocumentationProviders);
    mock('./source-code-provider', mockSourceCodeProvider);
    mock('./typedoc-json-provider', mockTypeDocJsonProvider);

    utils = mock.reRequire('./utils');

    warnSpy = spyOn(logger, 'warn');
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should export a Builder preload hook', function () {
    const obj = mock.reRequire('./plugin');
    const plugin = new obj.SkyUXPlugin();
    expect(typeof plugin.preload).toEqual('function');
  });

  it('should export a CLI callback', function () {
    const obj = mock.reRequire('./plugin');
    const plugin = new obj.SkyUXPlugin();
    expect(typeof plugin.runCommand).toEqual('function');
  });

  describe('Builder plugins', function () {

    it('should not run plugins by default', function () {
      const sourceCodeProviderSpy = spyOn(mockSourceCodeProvider, 'preload').and.callThrough();
      const typeDocJsonProviderSpy = spyOn(mockTypeDocJsonProvider, 'preload').and.callThrough();
      const documentationProvidersSpy = spyOn(mockDocumentationProviders, 'preload').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      const buffer = Buffer.from('foobar', 'utf8');
      const resourcePath = '/resource-path';

      plugin.preload(buffer, resourcePath, {
        runtime: {
          command: 'serve'
        }
      });

      expect(sourceCodeProviderSpy).not.toHaveBeenCalled();
      expect(typeDocJsonProviderSpy).not.toHaveBeenCalled();
      expect(documentationProvidersSpy).not.toHaveBeenCalled();
    });

    it('should run documentation plugins if @skyux/docs-tools found', () => {
      spyOn(utils, 'resolveModule').and.callFake(() => {});

      const sourceCodeProviderSpy = spyOn(mockSourceCodeProvider, 'preload').and.callThrough();
      const typeDocJsonProviderSpy = spyOn(mockTypeDocJsonProvider, 'preload').and.callThrough();
      const documentationProvidersSpy = spyOn(mockDocumentationProviders, 'preload').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      const buffer = Buffer.from('foobar', 'utf8');
      const resourcePath = '/resource-path';

      plugin.preload(buffer, resourcePath, {
        runtime: {
          command: 'serve'
        }
      });

      expect(sourceCodeProviderSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
      expect(typeDocJsonProviderSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
      expect(documentationProvidersSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
    });

    it('should run documentation plugins if executed local to skyux-docs-tools repo', () => {
      spyOn(process, 'cwd').and.returnValue('skyux-docs-tools');
      spyOn(utils, 'resolveModule').and.callFake(() => {});

      const sourceCodeProviderSpy = spyOn(mockSourceCodeProvider, 'preload').and.callThrough();
      const typeDocJsonProviderSpy = spyOn(mockTypeDocJsonProvider, 'preload').and.callThrough();
      const documentationProvidersSpy = spyOn(mockDocumentationProviders, 'preload').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      const buffer = Buffer.from('foobar', 'utf8');
      const resourcePath = '/resource-path';

      plugin.preload(buffer, resourcePath, {
        runtime: {
          command: 'serve'
        }
      });

      expect(sourceCodeProviderSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
      expect(typeDocJsonProviderSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
      expect(documentationProvidersSpy).toHaveBeenCalledWith(buffer.toString(), resourcePath);
    });

    it('should not run certain plugins for specific commands', function () {
      const sourceCodeProviderSpy = spyOn(mockSourceCodeProvider, 'preload').and.callThrough();
      const typeDocJsonProviderSpy = spyOn(mockTypeDocJsonProvider, 'preload').and.callThrough();
      const documentationProvidersSpy = spyOn(mockDocumentationProviders, 'preload').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      const buffer = Buffer.from('foobar', 'utf8');
      const resourcePath = '/resource-path';

      plugin.preload(buffer, resourcePath, {
        runtime: {
          command: 'build-public-library'
        }
      });

      expect(sourceCodeProviderSpy).not.toHaveBeenCalled();
      expect(typeDocJsonProviderSpy).not.toHaveBeenCalled();
      expect(documentationProvidersSpy).not.toHaveBeenCalled();
    });
  });

  describe('CLI plugins', function () {
    it('should run all plugins', function () {
      spyOn(utils, 'resolveModule').and.callFake(() => {});

      const documentationGeneratorSpy = spyOn(mockDocumentationGenerator, 'generateDocumentationFiles').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      plugin.runCommand('serve');

      expect(documentationGeneratorSpy).toHaveBeenCalled();
    });

    it('should not run certain plugins during tests', function () {
      spyOn(utils, 'resolveModule').and.callFake(() => {});

      const documentationGeneratorSpy = spyOn(mockDocumentationGenerator, 'generateDocumentationFiles').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      plugin.runCommand('test');
      plugin.runCommand('watch');

      expect(documentationGeneratorSpy).not.toHaveBeenCalled();
    });

    it('should not run certain plugins if @skyux/docs-tools not found', function () {
      const documentationGeneratorSpy = spyOn(mockDocumentationGenerator, 'generateDocumentationFiles').and.callThrough();

      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      plugin.runCommand('serve');

      expect(documentationGeneratorSpy).not.toHaveBeenCalled();
    });

    it('should not warn about missing @skyux/docs-tools library if unsupported command', function () {
      const obj = mock.reRequire('./plugin');
      const plugin = new obj.SkyUXPlugin();

      plugin.runCommand('serve');

      // Verify warning appears for supported commands.
      expect(warnSpy).toHaveBeenCalledWith('This library will not generate documentation because it does not include the optional `@skyux/docs-tools` NPM package. To generate documentation, please install the package as a development dependency: `npm i --save-exact --save-dev @skyux/docs-tools@latest`.');
      warnSpy.calls.reset();

      plugin.runCommand('test');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
