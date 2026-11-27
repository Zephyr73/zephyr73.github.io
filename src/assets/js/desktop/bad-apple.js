/**
 * bad-apple.js — Bad Apple!! ASCII Video + 8-Bit Chiptune Easter Egg Player
 * Plays synchronized ASCII frames alongside a 6-channel Web Audio 2A03-style synth.
 */

const DATA_URL = '/assets/data/bad-apple.bin';
const LOOKAHEAD_SEC = 0.2;
const SCHEDULER_MS = 45;

let cachedAssetPromise = null;
let activeSession = null;

/**
 * Loads and decompresses the Bad Apple!! video + chiptune dataset once, caching in memory.
 * @returns {Promise<object>}
 */
async function loadBadAppleData() {
  if (!cachedAssetPromise) {
    cachedAssetPromise = (async () => {
      const res = await fetch(DATA_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} loading Bad Apple stream`);
      }

      if (typeof DecompressionStream === 'undefined' || !res.body) {
        throw new Error('Browser lacks DecompressionStream support for gzipped stream');
      }

      const ds = new DecompressionStream('gzip');
      const decompressedStream = res.body.pipeThrough(ds);
      const text = await new Response(decompressedStream).text();
      return JSON.parse(text);
    })().catch((err) => {
      cachedAssetPromise = null;
      throw err;
    });
  }
  return cachedAssetPromise;
}

/**
 * Decodes an RLE-encoded ASCII frame string into a full multi-line frame.
 * @param {string} encoded
 * @returns {string}
 */
function decodeRleFrame(encoded) {
  let out = '';
  let countStr = '';
  for (let i = 0; i < encoded.length; i++) {
    const ch = encoded[i];
    if (ch >= '0' && ch <= '9') {
      countStr += ch;
    } else if (countStr.length > 0) {
      out += ch.repeat(parseInt(countStr, 10));
      countStr = '';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Pre-decodes frame index lookup so repeating ('=') frames resolve in O(1) at runtime.
 * @param {string[]} rawFrames
 * @returns {string[]}
 */
function resolveFrameRefs(rawFrames) {
  const resolved = new Array(rawFrames.length);
  let lastValid = '';
  for (let i = 0; i < rawFrames.length; i++) {
    if (rawFrames[i] === '=') {
      resolved[i] = lastValid;
    } else {
      resolved[i] = rawFrames[i];
      lastValid = rawFrames[i];
    }
  }
  return resolved;
}

/**
 * Creates a duty-cycle pulse PeriodicWave (NES 2A03 style).
 * @param {AudioContext} ctx
 * @param {number} duty - 0.125, 0.25, or 0.5
 * @returns {PeriodicWave}
 */
function createPulseWave(ctx, duty) {
  const harmonics = 32;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let k = 1; k <= harmonics; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * Generates a crunchy 1-second 8-bit stepped white noise buffer.
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
function createRetroNoiseBuffer(ctx) {
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const step = 3; // sample-and-hold factor for retro LFSR grit
  let sample = 0;
  for (let i = 0; i < length; i++) {
    if (i % step === 0) {
      sample = Math.random() * 2 - 1;
    }
    data[i] = sample;
  }
  return buffer;
}

/**
 * Converts a MIDI note number to frequency in Hz.
 * @param {number} midi
 * @returns {number}
 */
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Unpacks delta-encoded melodic track [dt, note, dur, ...] into absolute tick events.
 * @param {number[]} packed
 * @returns {Array<{tick: number, note: number, dur: number}>}
 */
function unpackMelodic(packed) {
  const events = [];
  let tick = 0;
  for (let i = 0; i < packed.length; i += 3) {
    tick += packed[i];
    events.push({ tick, note: packed[i + 1], dur: packed[i + 2] });
  }
  return events;
}

/**
 * Unpacks delta-encoded drum track [dt, kind, ...] into absolute tick events.
 * @param {number[]} packed
 * @returns {Array<{tick: number, kind: number}>}
 */
function unpackDrums(packed) {
  const events = [];
  let tick = 0;
  for (let i = 0; i < packed.length; i += 2) {
    tick += packed[i];
    events.push({ tick, kind: packed[i + 1] });
  }
  return events;
}

/**
 * Creates and starts the Touhou OST / PC-98 8-bit chiptune Web Audio scheduler for Bad Apple!!.
 */
function createChiptunePlayer(ctx, data, baseTime) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-14, ctx.currentTime);
  compressor.knee.setValueAtTime(12, ctx.currentTime);
  compressor.ratio.setValueAtTime(4, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.12, ctx.currentTime);

  const songGain = ctx.createGain();
  songGain.gain.setValueAtTime(0.55, ctx.currentTime);
  songGain.connect(compressor);
  compressor.connect(ctx.destination);

  // Warm lowpass bus for ZUN-style brassy PC-98 lead
  const leadFilter = ctx.createBiquadFilter();
  leadFilter.type = 'lowpass';
  leadFilter.frequency.setValueAtTime(3600, ctx.currentTime);
  leadFilter.Q.setValueAtTime(1.6, ctx.currentTime);
  leadFilter.connect(songGain);

  // Warm lowpass bus for punchy PC-98 bass
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.setValueAtTime(900, ctx.currentTime);
  bassFilter.connect(songGain);

  const pulse25 = createPulseWave(ctx, 0.25);
  const pulse125 = createPulseWave(ctx, 0.125);
  const noiseBuffer = createRetroNoiseBuffer(ctx);

  const channelConfigs = [
    {
      name: 'lead',
      events: unpackMelodic(data.tracks.lead || []),
      gain: 0.14,
      cursor: 0,
    },
    {
      name: 'synth',
      events: unpackMelodic(data.tracks.synth || []),
      wave: pulse25,
      gain: 0.085,
      cursor: 0,
    },
    {
      name: 'chord',
      events: unpackMelodic(data.tracks.chord || []),
      wave: pulse125,
      gain: 0.032,
      cursor: 0,
    },
    {
      name: 'bass',
      events: unpackMelodic(data.tracks.bass || []),
      gain: 0.25,
      cursor: 0,
    },
  ];
  const drumTrack = { events: unpackDrums(data.tracks.drums || []), cursor: 0 };

  const activeNodes = new Set();
  const audioStart = baseTime + (data.audioOffset || 0);
  const secPerTick = data.secPerTick;
  let stopped = false;

  const trackNode = (node, stopAt) => {
    activeNodes.add(node);
    node.onended = () => {
      activeNodes.delete(node);
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    };
    node.stop(stopAt);
  };

  const scheduleLeadNote = (ev, startAt, durSec, peak) => {
    // Dual detuned oscillators (sawtooth + 25% pulse) for ZUN-style Touhou brassy lead
    const freq = midiToFreq(ev.note);
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.setPeriodicWave(pulse25);
    oscA.frequency.setValueAtTime(freq, startAt);
    oscB.frequency.setValueAtTime(freq, startAt);
    oscA.detune.setValueAtTime(-5, startAt);
    oscB.detune.setValueAtTime(6, startAt);

    // Subtle vibrato on held notes
    if (durSec >= 0.26) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, startAt);
      lfoGain.gain.setValueAtTime(0, startAt);
      lfoGain.gain.linearRampToValueAtTime(9, startAt + 0.14);
      lfo.connect(lfoGain);
      lfoGain.connect(oscA.detune);
      lfoGain.connect(oscB.detune);
      lfo.start(startAt);
      trackNode(lfo, startAt + durSec + 0.02);
    }

    const g = ctx.createGain();
    const attack = 0.006;
    const decayEnd = Math.min(startAt + durSec, startAt + 0.09);
    const sustainLevel = peak * 0.78;
    const release = Math.min(0.03, durSec * 0.25);
    const sustainEnd = Math.max(decayEnd, startAt + durSec - release);

    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.linearRampToValueAtTime(peak, startAt + attack);
    g.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
    g.gain.setValueAtTime(sustainLevel, sustainEnd);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec + 0.012);

    oscA.connect(g);
    oscB.connect(g);
    g.connect(leadFilter);
    oscA.start(startAt);
    oscB.start(startAt);
    trackNode(oscA, startAt + durSec + 0.02);
    trackNode(oscB, startAt + durSec + 0.02);
  };

  const scheduleBassNote = (ev, startAt, durSec, peak) => {
    const freq = midiToFreq(ev.note);
    const tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(freq, startAt);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(freq, startAt);

    const gTri = ctx.createGain();
    const gSaw = ctx.createGain();
    const release = Math.min(0.025, durSec * 0.25);
    const sustainEnd = Math.max(startAt + 0.008, startAt + durSec - release);

    gTri.gain.setValueAtTime(0.0001, startAt);
    gTri.gain.linearRampToValueAtTime(peak, startAt + 0.005);
    gTri.gain.setValueAtTime(peak, sustainEnd);
    gTri.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec + 0.01);

    gSaw.gain.setValueAtTime(0.0001, startAt);
    gSaw.gain.linearRampToValueAtTime(peak * 0.28, startAt + 0.005);
    gSaw.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.min(durSec, 0.14));

    tri.connect(gTri);
    saw.connect(gSaw);
    gTri.connect(songGain);
    gSaw.connect(bassFilter);
    tri.start(startAt);
    saw.start(startAt);
    trackNode(tri, startAt + durSec + 0.02);
    trackNode(saw, startAt + durSec + 0.02);
  };

  const scheduleMelodicNote = (cfg, ev, startAt) => {
    const durSec = Math.max(0.03, ev.dur * secPerTick);
    if (cfg.name === 'lead') {
      scheduleLeadNote(ev, startAt, durSec, cfg.gain);
      return;
    }
    if (cfg.name === 'bass') {
      scheduleBassNote(ev, startAt, durSec, cfg.gain);
      return;
    }

    const osc = ctx.createOscillator();
    if (typeof cfg.wave === 'string') {
      osc.type = cfg.wave;
    } else {
      osc.setPeriodicWave(cfg.wave);
    }
    osc.frequency.setValueAtTime(midiToFreq(ev.note), startAt);

    const g = ctx.createGain();
    const peak = cfg.gain;
    const attack = Math.min(0.01, durSec * 0.25);
    const release = Math.min(0.03, durSec * 0.3);
    const sustainEnd = Math.max(startAt + attack, startAt + durSec - release);

    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.linearRampToValueAtTime(peak, startAt + attack);
    g.gain.setValueAtTime(peak, sustainEnd);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec + 0.01);

    osc.connect(g);
    g.connect(songGain);
    osc.start(startAt);
    trackNode(osc, startAt + durSec + 0.02);
  };

  const scheduleDrumHit = (kind, startAt) => {
    if (kind === 0) {
      // Kick: fast downward pitch sweep
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, startAt);
      osc.frequency.exponentialRampToValueAtTime(42, startAt + 0.09);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.42, startAt);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);

      osc.connect(g);
      g.connect(songGain);
      osc.start(startAt);
      trackNode(osc, startAt + 0.12);
      return;
    }

    if (kind === 1) {
      // Snare / Clap: short body thump + bandpass noise
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(185, startAt);
      osc.frequency.exponentialRampToValueAtTime(95, startAt + 0.045);

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.18, startAt);
      og.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.05);
      osc.connect(og);
      og.connect(songGain);
      osc.start(startAt);
      trackNode(osc, startAt + 0.06);

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1900, startAt);
      filter.Q.setValueAtTime(0.9, startAt);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.22, startAt);
      ng.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);

      noise.connect(filter);
      filter.connect(ng);
      ng.connect(songGain);
      noise.start(startAt);
      trackNode(noise, startAt + 0.12);
      return;
    }

    // Hi-hats, crash, shaker
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';

    let freq = 7000;
    let peak = 0.09;
    let dur = 0.03;
    if (kind === 3) {
      freq = 6400;
      peak = 0.11;
      dur = 0.11;
    } else if (kind === 4) {
      freq = 4400;
      peak = 0.14;
      dur = 0.36;
    } else if (kind === 5) {
      freq = 8500;
      peak = 0.028;
      dur = 0.018;
    }

    filter.frequency.setValueAtTime(freq, startAt);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(peak, startAt);
    ng.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

    noise.connect(filter);
    filter.connect(ng);
    ng.connect(songGain);
    noise.start(startAt);
    trackNode(noise, startAt + dur + 0.01);
  };

  const pump = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + LOOKAHEAD_SEC;

    for (const cfg of channelConfigs) {
      while (cfg.cursor < cfg.events.length) {
        const ev = cfg.events[cfg.cursor];
        const noteTime = audioStart + ev.tick * secPerTick;
        if (noteTime > horizon) break;
        if (noteTime >= ctx.currentTime - 0.05) {
          scheduleMelodicNote(cfg, ev, Math.max(ctx.currentTime, noteTime));
        }
        cfg.cursor++;
      }
    }

    while (drumTrack.cursor < drumTrack.events.length) {
      const ev = drumTrack.events[drumTrack.cursor];
      const hitTime = audioStart + ev.tick * secPerTick;
      if (hitTime > horizon) break;
      if (hitTime >= ctx.currentTime - 0.05) {
        scheduleDrumHit(ev.kind, Math.max(ctx.currentTime, hitTime));
      }
      drumTrack.cursor++;
    }
  };

  pump();
  const timerId = setInterval(pump, SCHEDULER_MS);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timerId);
    const now = ctx.currentTime;
    try {
      songGain.gain.cancelScheduledValues(now);
      songGain.gain.setValueAtTime(Math.max(0.0001, songGain.gain.value), now);
      songGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    } catch {
      // ignore gain errors on teardown
    }
    setTimeout(() => {
      for (const node of activeNodes) {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // already stopped
        }
      }
      activeNodes.clear();
      try {
        leadFilter.disconnect();
        bassFilter.disconnect();
        songGain.disconnect();
        compressor.disconnect();
      } catch {
        // ignore
      }
    }, 25);
  };

  return { stop };
}

/**
 * Returns whether Bad Apple!! is currently loading or playing.
 * @returns {boolean}
 */
export function isBadAppleRunning() {
  return activeSession !== null;
}

/**
 * Stops the active Bad Apple!! playback immediately (SIGINT / Ctrl+C).
 * @param {string} [reason='interrupted'] - 'interrupted' | 'finished' | 'aborted'
 * @returns {boolean} True if an active session was stopped
 */
export function stopBadApple(reason = 'interrupted') {
  if (!activeSession) return false;
  const session = activeSession;
  activeSession = null;
  session.stop(reason);
  return true;
}

/**
 * Starts Bad Apple!! ASCII video + 8-bit chiptune audio inside the shared terminal session.
 * @param {object} options
 * @param {object} options.terminalSession - window.__TERMINAL_SESSION__
 * @param {() => AudioContext} [options.getAudioContext]
 * @returns {Promise<void>}
 */
export async function startBadApple({ terminalSession, getAudioContext }) {
  if (activeSession) {
    stopBadApple('interrupted');
  }

  let cancelledDuringLoad = false;
  let hasStarted = false;
  let rafId = null;
  let chiptune = null;
  let lastRenderedIdx = -1;
  let lastFrameText = '';

  const sessionHandle = {
    stop(reason) {
      cancelledDuringLoad = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (chiptune) {
        chiptune.stop();
        chiptune = null;
      }
      if (hasStarted) {
        terminalSession.emit({
          type: 'bad-apple-end',
          reason,
          frameText: lastFrameText,
        });
      }
      if (reason === 'interrupted') {
        terminalSession.write('^C', 'dim');
      } else if (reason === 'finished') {
        terminalSession.write('[bad-apple] done.', 'dim');
      }
    },
  };

  activeSession = sessionHandle;
  terminalSession.write('playing bad-apple (Ctrl+C to stop)...', 'dim');

  let data;
  try {
    data = await loadBadAppleData();
  } catch (err) {
    if (activeSession === sessionHandle) {
      activeSession = null;
    }
    if (!cancelledDuringLoad) {
      terminalSession.write(`bad-apple: ${err.message}`, 'error');
    }
    return;
  }

  if (cancelledDuringLoad || activeSession !== sessionHandle) {
    return;
  }

  const frames = resolveFrameRefs(data.frames);
  const totalFrames = frames.length;
  const fps = data.fps || 15;
  const durationSec = totalFrames / fps;

  // Prepare Web Audio context (fallback clock if Web Audio is unavailable/blocked)
  let ctx = null;
  try {
    ctx = getAudioContext
      ? getAudioContext()
      : new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch {
    ctx = null;
  }

  if (cancelledDuringLoad || activeSession !== sessionHandle) {
    return;
  }

  const audioBaseTime = ctx ? ctx.currentTime + 0.06 : 0;
  const perfStartMs = performance.now() + 60;

  if (ctx) {
    chiptune = createChiptunePlayer(ctx, data, audioBaseTime);
  }

  hasStarted = true;
  lastFrameText = decodeRleFrame(frames[0]);
  terminalSession.emit({
    type: 'bad-apple-start',
    frameText: lastFrameText,
  });

  const tick = () => {
    if (activeSession !== sessionHandle) return;

    const elapsed = ctx
      ? ctx.currentTime - audioBaseTime
      : (performance.now() - perfStartMs) / 1000;

    if (elapsed >= durationSec) {
      stopBadApple('finished');
      return;
    }

    const idx = Math.max(0, Math.min(totalFrames - 1, Math.floor(elapsed * fps)));
    if (idx !== lastRenderedIdx) {
      lastRenderedIdx = idx;
      lastFrameText = decodeRleFrame(frames[idx]);
      terminalSession.emit({
        type: 'bad-apple-frame',
        frameText: lastFrameText,
      });
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}
