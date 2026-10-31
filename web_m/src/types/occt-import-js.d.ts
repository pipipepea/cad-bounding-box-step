declare module 'occt-import-js' {
  interface OcctImportOptions {
    locateFile?: (path: string, scriptDirectory?: string) => string;
    [key: string]: any;
  }

  interface OcctInstance {
    ReadStepFile: (fileBuffer: Uint8Array, params?: any) => any;
    ReadIgesFile: (fileBuffer: Uint8Array, params?: any) => any;
    ReadBrepFile: (fileBuffer: Uint8Array, params?: any) => any;
    ReadFile: (format: string, fileBuffer: Uint8Array, params?: any) => any;
  }

  function occtimportjs(options?: OcctImportOptions): Promise<OcctInstance>;
  export default occtimportjs;
}
