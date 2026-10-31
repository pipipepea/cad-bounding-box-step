import { ParsedCADModel } from './types';

export interface ParseCallbacks {
  onProgress: (step: string, percent: number) => void;
  onSuccess: (result: ParsedCADModel) => void;
  onError: (error: string) => void;
}

export class StepParserService {
  private worker: Worker | null = null;

  public parseStepFile(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileSize: number,
    callbacks: ParseCallbacks
  ) {
    this.terminate();

    try {
      // Classic Web Worker loaded directly from public directory
      this.worker = new Worker('/cad-worker.js');

      this.worker.onmessage = (e: MessageEvent<any>) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.type === 'progress') {
          callbacks.onProgress(msg.step, msg.percent);
        } else if (msg.type === 'success') {
          callbacks.onSuccess(msg.result);
          this.terminate();
        } else if (msg.type === 'error') {
          callbacks.onError(msg.error);
          this.terminate();
        }
      };

      this.worker.onerror = (err) => {
        console.error('Worker error:', err);
        callbacks.onError(`Lỗi Web Worker: ${err.message || 'Không thể tải hoặc thực thi worker'}`);
        this.terminate();
      };

      const message = {
        action: 'parse',
        buffer: fileBuffer,
        fileName,
        fileSize,
      };

      // Transfer the buffer for maximum performance
      this.worker.postMessage(message, [fileBuffer]);
    } catch (err: any) {
      callbacks.onError(`Không thể khởi tạo Web Worker: ${err?.message || err}`);
      this.terminate();
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stepParserService = new StepParserService();
