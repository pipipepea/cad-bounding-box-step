// Worker types and reference interface
export interface WorkerInputMessage {
  action: 'parse';
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
}

export type WorkerOutputMessage =
  | { type: 'progress'; step: string; percent: number }
  | { type: 'success'; result: any }
  | { type: 'error'; error: string };
