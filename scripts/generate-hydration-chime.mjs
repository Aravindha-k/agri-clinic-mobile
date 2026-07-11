/**
 * Generates a short two-tone hydration reminder chime (44.1 kHz mono WAV).
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(root, "assets/sounds/hydration_chime.wav");

const sampleRate = 44100;
const durationSec = 0.55;

function toneSample(t, freq, startSec, lengthSec, peak = 0.38) {
  if (t < startSec || t > startSec + lengthSec) {
    return 0;
  }
  const local = t - startSec;
  const attack = Math.min(1, local / 0.018);
  const release = Math.min(1, (lengthSec - local) / 0.12);
  const envelope = attack * release;
  return Math.sin(2 * Math.PI * freq * local) * envelope * peak;
}

const samples = [];
for (let i = 0; i < sampleRate * durationSec; i += 1) {
  const t = i / sampleRate;
  const sample =
    toneSample(t, 523.25, 0, 0.16, 0.34) +
    toneSample(t, 659.25, 0.13, 0.22, 0.36) +
    toneSample(t, 783.99, 0.28, 0.2, 0.22);
  samples.push(Math.max(-1, Math.min(1, sample)));
}

const dataSize = samples.length * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < samples.length; i += 1) {
  buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
}

writeFileSync(outPath, buffer);
console.log(`[generate-hydration-chime] wrote ${outPath}`);
