const path = require('path');
const mock = require('mock-require');

describe('Documentation generator', function () {
  let mockApplication;
  let mockFsExtra;
  let mockLogger;
  let mockRimraf;
  let mockTypeDoc;
  let mockTypes;

  let originalProcessOn;
  let processEvents;

  function triggerProcessOn(eventName) {
    processEvents[eventName].forEach(listener => listener());
  }

  beforeEach(function () {
    mockApplication = {
      bootstrap() {},
      convert() {
        return {
          children: mockTypes
        };
      },
      expandInputFiles() {},
      generateJson() {},
      options: {
        addReader() {}
      }
    };

    mockLogger = {
      info() {},
      warn() {}
    };

    mockRimraf = {
      sync() {}
    };

    mockTypes = [];

    mockFsExtra = {
      readJsonSync() {
        return {
          children: mockTypes
        };
      },
      writeJsonSync() {}
    };

    mockTypeDoc = {
      Application: function () {
        return mockApplication;
      },
      TSConfigReader: jasmine.createSpy('mockTSConfigReader')
    };

    mock('typedoc', mockTypeDoc);

    mock('rimraf', mockRimraf);

    mock('@blackbaud/skyux-logger', mockLogger);

    mock('fs-extra', mockFsExtra);

    processEvents = {};
    originalProcessOn = process.on;
    Object.defineProperty(process, 'on', {
      value: (eventName, callback) => {
        processEvents[eventName] = processEvents[eventName] || [];
        processEvents[eventName].push(callback);
      },
      writable: true
    });

    spyOn(process, 'exit').and.callFake(() => triggerProcessOn('exit'));
  });

  afterEach(() => {
    mock.stopAll();
    Object.defineProperty(process, 'on', {
      value: originalProcessOn
    });
  });

  it('should generate docs from src/app/public', function () {
    const expandSpy = spyOn(mockApplication, 'expandInputFiles').and.callThrough();
    const generateSpy = spyOn(mockApplication, 'generateJson').and.callThrough();

    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();

    expect(expandSpy).toHaveBeenCalledWith(['src/app/public']);
    expect(generateSpy).toHaveBeenCalledWith({ children: [] }, path.join(generator.outputDir, 'documentation.json'));
  });

  it('should remove properties that are extended by a type in node_modules', function () {
    mockTypes = [
      {
        name: 'FooType',
        kindString: 'Class',
        children: [
          {
            name: '_fooStream',
            description: 'This property exists on the type extended by FooType.',
            sources: [
              {
                fileName: 'node_modules/rxjs/internal/Observable.d.ts'
              }
            ]
          },
          {
            name: 'publicProperty',
            sources: [
              {
                fileName: 'src/app/public/modules/foo/foo-type.ts'
              }
            ]
          }
        ]
      }
    ];

    const generateSpy = spyOn(mockApplication, 'generateJson').and.callThrough();

    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();

    expect(generateSpy).toHaveBeenCalledWith({
      children: [
        {
          name: 'FooType',
          kindString: 'Class',
          children: [
            {
              name: 'publicProperty',
              sources: [
                {
                  fileName: 'src/app/public/modules/foo/foo-type.ts'
                }
              ]
            }
          ],
          anchorId: 'class-footype'
        }
      ]
    }, path.join(generator.outputDir, 'documentation.json'));
  });

  it('should generate anchor IDs for each type', function () {
    mockTypes = [
      {
        name: 'FooDirective',
        kindString: 'Directive'
      },
      {
        name: 'FooService',
        kindString: 'Injectable'
      },
      {
        name: 'FooType',
        kindString: 'Enumeration'
      },
      {
        name: '',
        kindString: 'TypeAlias'
      }
    ];

    const generateSpy = spyOn(mockApplication, 'generateJson').and.callThrough();

    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();

    expect(generateSpy).toHaveBeenCalledWith({
      children: [
        {
          name: 'FooDirective',
          kindString: 'Directive',
          anchorId: 'directive-foodirective'
        },
        {
          name: 'FooService',
          kindString: 'Injectable',
          anchorId: 'injectable-fooservice'
        },
        {
          name: 'FooType',
          kindString: 'Enumeration',
          anchorId: 'enumeration-footype'
        },
        {
          name: '',
          kindString: 'TypeAlias',
          anchorId: 'typealias-undefined'
        }
      ]
    }, path.join(generator.outputDir, 'documentation.json'));
  });

  it('should ignore anchor IDs for variables', function () {
    mockTypes = [
      {
        name: 'moment',
        kindString: 'Variable'
      }
    ];

    const jsonSpy = spyOn(mockFsExtra, 'writeJsonSync').and.callThrough();

    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();

    expect(jsonSpy.calls.mostRecent().args[1].anchorIds).toEqual({});
  });

  it('should error if project generation fails', function () {
    spyOn(mockApplication, 'convert').and.returnValue(undefined);

    const generator = mock.reRequire('./documentation-generator');

    expect(() => {
      generator.generateDocumentationFiles();
    }).toThrowError(
      'TypeDoc project generation failed. This usually occurs when the underlying TypeScript project does not compile or is invalid. Try running `skyux build` to list any compiler issues.'
    );
  });

  it('should remove temp files when the process exits', () => {
    const spy = spyOn(mockRimraf, 'sync').and.callThrough();
    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();

    triggerProcessOn('SIGINT');

    expect(spy).toHaveBeenCalledWith(generator.outputDir);
  });

  it('should load tsconfig.json from project', () => {
    const generator = mock.reRequire('./documentation-generator');
    generator.generateDocumentationFiles();
    expect(mockTypeDoc.TSConfigReader).toHaveBeenCalled();
  });
});
