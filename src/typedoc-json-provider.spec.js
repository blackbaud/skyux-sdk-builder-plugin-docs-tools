const mock = require('mock-require');
const path = require('path');

describe('TypeDoc JSON provider', function () {
  let mockFsExtra;
  let mockJsonContent;

  const defaultContent = 'export class SampleTypeDefinitionsProvider {';
  const defaultFilePath = path.join('src', 'app', 'public', 'plugin-resources', 'sample-type-definitions-provider.ts');

  const PLUGIN_PATH = './typedoc-json-provider';

  beforeEach(() => {
    mockJsonContent = {
      anchorIds: {},
      children: []
    };

    mockFsExtra = {
      existsSync: () => true,
      readJsonSync: () => mockJsonContent
    };

    mock('fs-extra', mockFsExtra);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should inject TypeDoc information into the provider', () => {
    const content = Buffer.from(defaultContent, 'utf8');

    mockJsonContent = {
      anchorIds: {
        foo: 'foo-id'
      },
      children: [{
        name: 'FooType'
      }]
    };

    const plugin = mock.reRequire(PLUGIN_PATH);
    const modified = plugin.preload(content, defaultFilePath).toString();

    expect(modified).toContain(`public readonly anchorIds: {[_: string]: string} = {"foo":"foo-id"};
  public readonly typeDefinitions: any[] = [{"name":"FooType"}];`);
  });

  it('should handle documentation.json not found', () => {
    const content = Buffer.from(defaultContent, 'utf8');

    spyOn(mockFsExtra, 'existsSync').and.returnValue(false);
    const readSpy = spyOn(mockFsExtra, 'readJsonSync').and.callThrough();

    const plugin = mock.reRequire(PLUGIN_PATH);
    plugin.preload(content, defaultFilePath).toString();

    expect(readSpy).not.toHaveBeenCalled();
  });

  it('should not alter content if file is not named correctly', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('src', 'app', 'public', 'plugin-resources', 'foo.text');

    const plugin = mock.reRequire(PLUGIN_PATH);
    const modified = plugin.preload(content, resourcePath);

    expect(content).toEqual(modified);
  });

  it('should not alter content if file is not located in `plugin-resources` dir', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('src', 'app', 'public', 'foo.text');

    const plugin = mock.reRequire(PLUGIN_PATH);
    const modified = plugin.preload(content, resourcePath);

    expect(content).toEqual(modified);
  });

  it('should use local version of docs-tools if within docs-tools repo', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('/skyux-docs-tools', defaultFilePath);
    const plugin = mock.reRequire(PLUGIN_PATH);
    const modified = plugin.preload(content, resourcePath).toString();
    expect(modified).not.toContain('@skyux/docs-tools');
    expect(modified).toContain('\'./public/public_api\'');
  });

});
