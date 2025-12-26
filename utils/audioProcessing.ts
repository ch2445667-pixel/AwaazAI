
/**
 * Decoding base64 PCM string from Gemini API
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM bytes to AudioBuffer
 */
export async function decodePCMToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encodes AudioBuffer to a WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

/**
 * Applies speed and pitch changes to an AudioBuffer and returns a new AudioBuffer.
 * Uses an Overlap-Add (OLA) algorithm to independently control speed and pitch.
 * This ensures that changing the playback speed does not affect the voice's pitch.
 */
export async function processAudio(
  buffer: AudioBuffer,
  speed: number,
  pitch: number
): Promise<AudioBuffer> {
  // Target Speed S, Pitch shift P (semitones).
  // Standard Web Audio playbackRate changes both. To decouple them:
  // 1. Calculate the resampling factor required for the pitch shift (F = 2^(P/12)).
  // 2. We need the final speed to be S. Since resampling by F already changes speed by F,
  //    we must first time-stretch the buffer by ratio R such that R * F = S.
  //    Therefore, R = S / F.
  
  const pitchFactor = Math.pow(2, pitch / 12);
  const stretchRatio = speed / pitchFactor;

  // 1. Time-stretch the audio using OLA (preserves pitch)
  const stretched = timeStretch(buffer, stretchRatio);
  
  // 2. Apply the desired pitch shift using resampling in an OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(
    stretched.numberOfChannels,
    Math.max(1, Math.floor(stretched.length / pitchFactor)),
    stretched.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = stretched;
  source.playbackRate.value = pitchFactor;

  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Basic Overlap-Add (OLA) time-stretching.
 * Ratio > 1.0 speeds up (shortens duration), Ratio < 1.0 slows down (lengthens duration).
 * This implementation uses a Hann window with 50% overlap to preserve signal continuity.
 */
function timeStretch(buffer: AudioBuffer, ratio: number): AudioBuffer {
  if (Math.abs(ratio - 1.0) < 0.001) return buffer;

  const numChannels = buffer.numberOfChannels;
  const oldLength = buffer.length;
  const newLength = Math.max(1, Math.floor(oldLength / ratio));
  const sampleRate = buffer.sampleRate;

  const outBuffer = new AudioBuffer({
    length: newLength,
    numberOfChannels: numChannels,
    sampleRate: sampleRate
  });

  // Windowing parameters: 1024 samples @ 24kHz is ~42ms window
  const windowSize = 1024;
  const hopSize = 512; // 50% overlap
  const outHopSize = Math.floor(hopSize / ratio);

  // Pre-generate Hann window
  const hann = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  for (let channel = 0; channel < numChannels; channel++) {
    const input = buffer.getChannelData(channel);
    const output = outBuffer.getChannelData(channel);
    
    // Track weight sum for OLA normalization to prevent clipping/volume artifacts
    const weights = new Float32Array(newLength);

    for (let i = 0; i < newLength - windowSize; i += outHopSize) {
      const inputIdx = Math.floor(i * ratio);
      if (inputIdx + windowSize > oldLength) break;

      for (let j = 0; j < windowSize; j++) {
        output[i + j] += input[inputIdx + j] * hann[j];
        weights[i + j] += hann[j];
      }
    }

    // Normalize overlapping windows
    for (let i = 0; i < newLength; i++) {
      if (weights[i] > 0.01) {
        output[i] /= weights[i];
      }
    }
  }

  return outBuffer;
}
