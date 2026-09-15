import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioPeaks, voiceTime } from '../public/voice-player.js';

test('waveform measures audio energy from every channel and preserves silence', () => {
  const channels = [new Float32Array([0, 0, .5, -.8, 0, 0, .1, .2]), new Float32Array([0, 0, .1, .2, 0, 0, -.9, .1])];
  const peaks = audioPeaks({ numberOfChannels: 2, getChannelData: i => channels[i] }, 4);
  assert.equal(peaks[0], 0);
  assert.equal(peaks[2], 0);
  assert.ok(Math.abs(peaks[1] - Math.sqrt((.25 + .64) / 2)) < 1e-6);
  assert.ok(Math.abs(peaks[3] - Math.sqrt((.81 + .01) / 2)) < 1e-6);
});

test('playback clock handles minute boundaries and the precise playhead', () => {
  assert.equal(voiceTime(133.44), '2:13');
  assert.equal(voiceTime(28.5, true), '0:28.5');
  assert.equal(voiceTime(-1), '0:00');
});
