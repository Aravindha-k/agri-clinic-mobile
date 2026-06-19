/**
 * Imports the first N seconds of the Freesound water-pour MP3 into water_pour.wav.
 * Source: assets/sounds/water_pour_source.mp3 (or WATER_POUR_SOURCE env path).
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import decode from "audio-decode";
import WavEncoder from "wav-encoder";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = resolve(root, "assets/sounds/water_pour_source.mp3");
const OUT_WAV = resolve(root, "assets/sounds/water_pour.wav");
const CLIP_SECONDS = 5;
const TARGET_RATE = 44100;
const TARGET_PEAK = 0.88;

function resolveSourcePath() {
  const env = process.env.WATER_POUR_SOURCE;
  if (env && existsSync(env)) {
    return resolve(env);
  }
  return DEFAULT_SOURCE;
}

function resample(channelData, sourceRate, targetRate) {
  if (sourceRate === targetRate) {
    return channelData;
  }

  const ratio = sourceRate / targetRate;
  const outLength = Math.floor(channelData.length / ratio);
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i += 1) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(channelData.length - 1, i0 + 1);
    const frac = srcIdx - i0;
    out[i] = channelData[i0] * (1 - frac) + channelData[i1] * frac;
  }

  return out;
}

function normalizeSoft(samples, peak) {
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    max = Math.max(max, Math.abs(samples[i]));
  }
  if (max < 1e-6) {
    return samples;
  }

  const scale = peak / max;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = samples[i] * scale;
  }
  return out;
}

async function main() {
  const sourcePath = resolveSourcePath();
  if (!existsSync(sourcePath)) {
    console.error(`[import-water-pour-sound] missing source: ${sourcePath}`);
    process.exit(1);
  }

  if (sourcePath !== DEFAULT_SOURCE) {
    copyFileSync(sourcePath, DEFAULT_SOURCE);
    console.log(`[import-water-pour-sound] copied source to ${DEFAULT_SOURCE}`);
  }

  const decoded = await decode(readFileSync(sourcePath));
  const clipSamples = Math.min(
    decoded.channelData[0].length,
    Math.floor(decoded.sampleRate * CLIP_SECONDS)
  );

  let mono = decoded.channelData[0].subarray(0, clipSamples);
  if (decoded.numberOfChannels > 1) {
    mono = new Float32Array(clipSamples);
    for (let i = 0; i < clipSamples; i += 1) {
      let sum = 0;
      for (let ch = 0; ch < decoded.numberOfChannels; ch += 1) {
        sum += decoded.channelData[ch][i];
      }
      mono[i] = sum / decoded.numberOfChannels;
    }
  }

  const resampled = resample(mono, decoded.sampleRate, TARGET_RATE);
  const normalized = normalizeSoft(resampled, TARGET_PEAK);
  const wavBuffer = await WavEncoder.encode({
    sampleRate: TARGET_RATE,
    channelData: [normalized]
  });

  writeFileSync(OUT_WAV, Buffer.from(wavBuffer));
  const durationSec = (normalized.length / TARGET_RATE).toFixed(2);
  console.log(`[import-water-pour-sound] wrote ${OUT_WAV} (${durationSec}s from ${sourcePath})`);
}

main().catch((error) => {
  console.error("[import-water-pour-sound] failed:", error);
  process.exit(1);
});
