const mock = require('mock-require');
const path = require('path');

describe('Source code provider', () => {
  let mockFsExtra;
  let mockGlob;

  const defaultContent = 'export class SampleSourceCodeProvider {';
  const defaultFilePath = path.join('src', 'app', 'public', 'plugin-resources', 'sample-source-code-provider.ts');

  beforeEach(() => {
    mockFsExtra = {
      ensureFileSync: () => {
        return true;
      },
      pathExistsSync: () => {
        return true;
      },
      readFileSync: (file) => {
        switch (file) {
          default:
            return false;
          case 'src/app/public/plugin-resources/code-examples/sample.component.ts':
            return `import { Component } from '@angular/core';
@Component({
  selector: 'sample',
  templateUrl: './sample.component.html',
  styleUrls: ['./sample.component.scss']
})
export class SampleDemoComponent {}
`;
        }
      }
    };

    mockGlob = {
      sync: () => {
        return [];
      }
    };

    mock('fs-extra', mockFsExtra);
    mock('glob', mockGlob);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should handle no source files found', () => {
    const content = Buffer.from(defaultContent, 'utf8');

    const plugin = mock.reRequire('./source-code-provider');
    const modified = plugin.preload(content, defaultFilePath).toString();

    expect(modified).toContain('public readonly sourceCode: any[] = [];');
  });

  it('should inject source code information into the provider', () => {
    spyOn(mockGlob, 'sync').and.callFake((pattern) => {
      switch (pattern) {
        default:
          return [];
        case path.join('src/app/public/plugin-resources/code-examples', '**', '*.{ts,js,html,scss}'):
          return [
            'src/app/public/plugin-resources/code-examples/sample.component.ts'
          ];
      }
    });

    const content = Buffer.from(defaultContent, 'utf8');

    const plugin = mock.reRequire('./source-code-provider');
    const modified = plugin.preload(content, defaultFilePath).toString();

    expect(modified).toContain(`public readonly sourceCode: any[] = [
  {
    "fileName": "sample.component.ts",
    "filePath": "src/app/public/plugin-resources/code-examples/sample.component.ts",
    "rawContents": "import%20%7B%20Component%20%7D%20from%20'%40angular%2Fcore'%3B%0A%40Component(%7B%0A%20%20selector%3A%20'sample'%2C%0A%20%20templateUrl%3A%20'.%2Fsample.component.html'%2C%0A%20%20styleUrls%3A%20%5B'.%2Fsample.component.scss'%5D%0A%7D)%0Aexport%20class%20SampleDemoComponent%20%7B%7D%0A"
  }
];`);
  });

  it('should not alter content if file is not named correctly', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('src', 'app', 'public', 'plugin-resources', 'foo.text');

    const plugin = mock.reRequire('./source-code-provider');
    const modified = plugin.preload(content, resourcePath);

    expect(content).toEqual(modified);
  });

  it('should use local version of docs-tools if within docs-tools repo', () => {
    const content = Buffer.from(defaultContent, 'utf8');
    const resourcePath = path.join('/skyux-docs-tools', defaultFilePath);
    const plugin = mock.reRequire('./source-code-provider');
    const modified = plugin.preload(content, resourcePath).toString();
    expect(modified).not.toContain('@skyux/docs-tools');
    expect(modified).toContain('\'./public/public_api\'');
  });
});
