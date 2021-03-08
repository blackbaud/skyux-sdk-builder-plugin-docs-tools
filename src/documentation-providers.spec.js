const mock = require('mock-require');
const path = require('path');

describe('Documentation providers', () => {
  let mockFsExtra;
  let mockGlob;

  const defaultContent = `@NgModule({})
export class AppExtrasModule { }
`;
  const defaultFilePath = path.join('src', 'app', 'app-extras.module.ts');

  beforeEach(() => {
    mockFsExtra = {
      ensureFileSync: () => true,
      existsSync: () => true,
      pathExistsSync: () => true,
      readJsonSync: () => {
        return {
          anchorIds: {},
          children: []
        };
      },
      readFileSync: () => ''
    };

    mockGlob = {
      sync: () => []
    };

    mock('fs-extra', mockFsExtra);
    mock('glob', mockGlob);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should add imports and providers to AppExtrasModule', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, defaultFilePath).toString();

    expect(modified).toContain(`import {
  SkyDocsSourceCodeProvider,
  SkyDocsTypeDefinitionsProvider
} from '@skyux/docs-tools';`);

    expect(modified).toContain(`export class SkyDocsSourceCodeImplService {
  public readonly sourceCode: any[] = [];
}

export class SkyDocsTypeDefinitionsImplService {
  public readonly anchorIds: {[_: string]: string} = {};
  public readonly typeDefinitions: any[] = [];
}`);

    expect(modified).toContain(`providers: [
    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    },
    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }
  ]`);

  });

  it('should not modify any other files', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, 'foobar.ts').toString();
    expect(modified).toEqual(defaultContent);
  });

  it('should not modify AppExtrasModule if consumer adds providers manually', () => {
    const source = `@NgModule({
  providers: [
    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    },
    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }
  ]
})
export class AppExtrasModule { }`;

    const content = Buffer.from(source, 'utf8');
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, defaultFilePath).toString();
    expect(modified).toEqual(source);
  });

  it('should add missing providers if the user adds only a few manually', () => {
    let source = `@NgModule({
  providers: [
    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    }
  ]
})
export class AppExtrasModule { }`;

    let content = Buffer.from(source, 'utf8');
    let plugin = mock.reRequire('./documentation-providers');
    let modified = plugin.preload(content, defaultFilePath).toString();
    expect(modified).toContain(`{
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }`);

    source = `@NgModule({
  providers: [
    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }
  ]
})
export class AppExtrasModule { }`;

    content = Buffer.from(source, 'utf8');
    plugin = mock.reRequire('./documentation-providers');
    modified = plugin.preload(content, defaultFilePath).toString();
    expect(modified).toContain(`{
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    }`);
  });

  it('should not override existing providers', () => {
    const source = `@NgModule({
  providers: [
    FooService
  ]
})
export class AppExtrasModule { }`;

    const content = Buffer.from(source, 'utf8');
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, defaultFilePath).toString();
    expect(modified).toContain(`providers: [
    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    },
    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    },
    FooService
  ]`);
  });

  it('should format providers array if other module properties exist', () => {
    const source = `@NgModule({
  imports: [],
  exports: []
})
export class AppExtrasModule { }`;

    const content = Buffer.from(source, 'utf8');
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, defaultFilePath).toString();
    expect(modified).toContain(`providers: [
    {
      provide: SkyDocsSourceCodeProvider,
      useClass: SkyDocsSourceCodeImplService
    },
    {
      provide: SkyDocsTypeDefinitionsProvider,
      useClass: SkyDocsTypeDefinitionsImplService
    }
  ],
  imports: [],
  exports: []`);
  });

  it('should use local version of docs-tools if within docs-tools repo', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('/skyux-docs-tools', defaultFilePath);
    const plugin = mock.reRequire('./documentation-providers');
    const modified = plugin.preload(content, resourcePath).toString();
    expect(modified).not.toContain('@skyux/docs-tools');
    expect(modified).toContain('\'./public/public_api\'');
  });
});
