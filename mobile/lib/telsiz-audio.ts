import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Ham 16-bit mono PCM parçalarını çalınabilir WAV dosya baytlarına çevirir. */
export function pcmChunksToWav(chunks: string[], sampleRate: number): Uint8Array {
  const parts = chunks.map(base64ToBytes);
  const dataLength = parts.reduce((sum, p) => sum + (p.length - (p.length % 2)), 0);
  const out = new Uint8Array(44 + dataLength);
  const view = new DataView(out.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (const p of parts) {
    const even = p.length - (p.length % 2);
    out.set(p.subarray(0, even), offset);
    offset += even;
  }
  return out;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

let fileCounter = 0;

function writeTempAudio(bytes: Uint8Array, extension: string): File {
  fileCounter = (fileCounter + 1) % 1000;
  const file = new File(Paths.cache, `telsiz-${Date.now()}-${fileCounter}.${extension}`);
  file.write(bytes);
  return file;
}

/** Gelen ses parçalarını sırayla, üst üste binmeden çalar. */
export class TelsizPlaybackQueue {
  private queue: File[] = [];
  private player: AudioPlayer | null = null;
  private current: File | null = null;
  private muted = false;
  private disposed = false;
  onActiveChange?: (active: boolean) => void;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.clear();
  }

  enqueuePcm(chunks: string[], sampleRate: number) {
    if (this.muted || this.disposed || chunks.length === 0) return;
    this.enqueueFile(writeTempAudio(pcmChunksToWav(chunks, sampleRate), "wav"));
  }

  enqueueClip(base64: string, mime: string) {
    if (this.muted || this.disposed || !base64) return;
    const ext = MIME_EXTENSIONS[mime.split(";")[0].trim().toLowerCase()] ?? "m4a";
    this.enqueueFile(writeTempAudio(base64ToBytes(base64), ext));
  }

  private enqueueFile(file: File) {
    this.queue.push(file);
    if (!this.player) this.playNext();
  }

  private playNext() {
    this.cleanupCurrent();
    const next = this.queue.shift();
    if (!next || this.disposed) {
      this.onActiveChange?.(false);
      return;
    }
    this.onActiveChange?.(true);
    this.current = next;
    const player = createAudioPlayer({ uri: next.uri });
    this.player = player;
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) this.playNext();
    });
    player.play();
  }

  private cleanupCurrent() {
    if (this.player) {
      try {
        this.player.remove();
      } catch {
        // oynatıcı zaten serbest
      }
      this.player = null;
    }
    if (this.current) {
      try {
        this.current.delete();
      } catch {
        // geçici dosya zaten silinmiş
      }
      this.current = null;
    }
  }

  clear() {
    for (const file of this.queue) {
      try {
        file.delete();
      } catch {
        // yoksay
      }
    }
    this.queue = [];
    this.cleanupCurrent();
    this.onActiveChange?.(false);
  }

  dispose() {
    this.disposed = true;
    this.clear();
  }
}
