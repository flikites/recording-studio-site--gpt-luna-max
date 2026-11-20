"""Synthesize raw & mixed demos for The Signal Room site. Deterministic (seeded)."""
import numpy as np
import soundfile as sf
import lameenc, io, os

SR = 44100
DUR = 36.0
N = int(SR * DUR)

def midi_to_hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def adsr(n, a, d, s_level, r):
    a, d, r = max(1, int(a)), max(1, int(d)), max(1, int(r))
    env = np.ones(n)
    na = min(a, n); env[:na] = np.linspace(0, 1, na)
    nd = min(d, n - na); env[na:na+nd] = np.linspace(1, s_level, nd)
    rs = n - r
    if rs > 0:
        # sustain till release
        env[na+nd:rs] = s_level
        nr = min(r, n - rs)
        env[rs:rs+nr] = s_level * np.linspace(1, 0, nr)
    return env

def kick(t_start, pitch=48, decay=0.32, sr=SR):
    n = int(decay * sr)
    t = np.arange(n) / sr
    f0 = midi_to_hz(pitch + 12); f1 = midi_to_hz(pitch - 12)
    freq = f1 + (f0 - f1) * np.exp(-t * 18)
    phase = 2 * np.pi * np.cumsum(freq) / sr
    sig = np.sin(phase) * np.exp(-t * 9)
    sig += 0.35 * np.sin(2 * phase) * np.exp(-t * 22)
    sig[:int(0.004*sr)] *= np.linspace(0, 1, int(0.004*sr))
    return sig

def hat(t_start, open_=False, gain=1.0, sr=SR):
    dur = 0.28 if open_ else 0.045
    n = int(dur * sr)
    noise = np.random.default_rng(int(t_start*1000)+7).standard_normal(n)
    # highpass via difference
    hp = noise - np.concatenate([[0], noise[:-1]]) * 0.9
    env = np.exp(-t_start*0 + np.arange(n)/sr * (7 if open_ else 55))
    return hp * env * 0.5 * gain

def clap(sr=SR):
    n = int(0.22 * sr)
    noise = np.random.default_rng(42).standard_normal(n)
    bursts = np.zeros(n)
    for off in [0, 0.011, 0.023]:
        i = int(off * sr)
        bursts[i:] += np.exp(-np.arange(n-i)/sr*38) * np.sin(2*np.pi*1900*np.arange(n-i)/sr)*0 + np.exp(-np.arange(n-i)/sr*38)
    return noise * bursts * 0.6

def pad_note(midi, dur, detune=9, sr=SR):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = midi_to_hz(midi)
    sig = np.zeros(n)
    for det in (-detune, 0, detune):
        fd = f * 2 ** (det / 1200)
        sig += np.sin(2*np.pi*fd*t) + 0.5*np.sin(2*np.pi*2*fd*t) + 0.25*np.sin(2*np.pi*3*fd*t)
    sig *= adsr(n, 0.35*sr, 0.4*sr, 0.75, 0.6*sr)
    # one-pole lowpass
    y = np.empty(n); acc = 0.0; a = 0.28
    for i in range(n):
        acc = acc + a * (sig[i] - acc); y[i] = acc
    return y * 0.16

def pluck(midi, dur=1.6, sr=SR):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = midi_to_hz(midi)
    sig = np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*2*f*t)*0.5 + 0.18*np.sin(2*np.pi*3*f*t)*0.25
    sig *= np.exp(-t * 4.2)
    return sig * 0.28

def sub_bass(midi, dur, sr=SR):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = midi_to_hz(midi - 12)  # sub octave
    sig = np.sin(2*np.pi*f*t) + 0.15*np.sin(2*np.pi*2*f*t)
    sig *= adsr(n, 0.01*sr, 0.1*sr, 0.9, 0.25*sr)
    return sig * 0.8

def saw_note(midi, dur, sr=SR):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = midi_to_hz(midi - 12)
    phase = (f * t) % 1.0
    sig = 2*phase - 1
    y = np.empty(n); acc = 0.0; a = 0.35
    for i in range(n):
        acc += a*(sig[i]-acc); y[i] = acc
    y *= adsr(n, 0.01*sr, 0.2*sr, 0.8, 0.3*sr)
    return y * 0.5

TRACKS = [
    # name, bpm, root midi (minor), seed
    ('no-ceilings',        142, 42,  11),  # F#m
    ('pressure',            96, 36,  22),  # Cm
    ('midnight-in-pompano',158, 43,  33),  # Gm
    ('brick-by-brick',     140, 40,  44),  # Em
    ('two-am-facade',      132, 38,  55),  # Dm
    ('above-the-rim',      150, 45,  66),  # Am
]

MINOR = [0, 2, 3, 5, 7, 8, 10]
PROG = [0, 5, 3, 6]  # i, VI, III, VII (natural minor degrees, semitone offsets idx into MINOR)
PROG_SEMI = [0, 8, 3, 10]

def render(name, bpm, root, seed):
    rng = np.random.default_rng(seed)
    beat = 60.0 / bpm
    bars = int(DUR / (beat * 4)) + 1
    mix = np.zeros((N, 2), dtype=np.float64)

    kick_pat = [0, 7, 10, 16, 23, 26, 32]  # per 2 bars (32 steps, 16th grid)
    clap_steps = [4, 12, 20, 28]
    # bass/melody line per bar: chord degrees
    total_steps = bars * 16
    for step in range(total_steps):
        t = step * (beat / 4)
        if t >= DUR - 0.5: break
        s16 = step % 16
        bar = step // 16
        chord_i = PROG_SEMI[(bar // 1) % 4]
        if s16 in (0, 3, 6, 10, 12) and rng.random() < (0.9 if s16 == 0 else 0.55):
            p = kick(t, pitch=36 + (chord_i % 12) % 12, decay=0.3)
            i0 = int(t * SR); i1 = min(N, i0 + len(p)); mix[i0:i1, 0] += p[:i1-i0]; mix[i0:i1, 1] += p[:i1-i0]
        if s16 in clap_steps:
            p = clap(); i0 = int(t * SR); i1 = min(N, i0 + len(p))
            mix[i0:i1, 0] += p[:i1-i0] * 0.8; mix[i0:i1, 1] += p[:i1-i0] * 0.8
        # hats: every 8th, occasional 16th roll
        if s16 % 2 == 0:
            p = hat(t, gain=1.0 if s16 % 4 else 0.75)
            pan = 0.5 + 0.18 * ((step % 8) / 7 - 0.5)
            i0 = int(t * SR); i1 = min(N, i0 + len(p))
            mix[i0:i1, 0] += p[:i1-i0] * (1 - pan * 0.6); mix[i0:i1, 1] += p[:i1-i0] * (0.55 + pan * 0.6)
        if s16 in (14,) and rng.random() < 0.6:
            for k in range(4):
                p = hat(t + k * beat/16, gain=0.5 + 0.15*k)
                i0 = int((t + k*beat/16) * SR); i1 = min(N, i0 + len(p))
                mix[i0:i1, 0] += p[:i1-i0]; mix[i0:i1, 1] += p[:i1-i0]
        # open hat offbeat
        if s16 == 14 and bar % 2 == 1:
            p = hat(t, open_=True, gain=0.8); i0 = int(t*SR); i1 = min(N, i0+len(p))
            mix[i0:i1, 0] += p[:i1-i0]*0.8; mix[i0:i1, 1] += p[:i1-i0]*1.0
    # bass line: root notes following progression, half-time feel
    for bar in range(bars):
        t = bar * 4 * beat
        if t >= DUR - 1: break
        root_n = root + PROG_SEMI[bar % 4]
        for off_beats, dur_b in [(0, 1.5), (2, 1.0), (3, 0.75)]:
            tt = t + off_beats * beat
            if tt >= DUR - 0.5: break
            p = sub_bass(root_n + 12, dur_b * beat)
            i0 = int(tt * SR); i1 = min(N, i0 + len(p)); mix[i0:i1, 0] += p[:i1-i0]; mix[i0:i1, 1] += p[:i1-i0]
    # pads: whole notes per chord
    for bar in range(bars):
        t = bar * 4 * beat
        if t >= DUR - 1: break
        chord_root = root + PROG_SEMI[bar % 4]
        for iv in [0, 3, 7]:
            p = pad_note(chord_root + 12 + iv, 4 * beat + 0.4)
            i0 = int(t * SR); i1 = min(N, i0 + len(p))
            pan_l = 0.6 if iv == 0 else (0.35 if iv == 3 else 0.2)
            mix[i0:i1, 0] += p[:i1-i0] * (1.2 - pan_l); mix[i0:i1, 1] += p[:i1-i0] * pan_l
    # pluck melody: sparse 2-bar phrases
    scale = [root + 24 + m for m in MINOR] + [root + 36 + m for m in MINOR]
    for bar in range(0, bars, 2):
        t0 = bar * 4 * beat
        phrase_len = 6
        for k in range(phrase_len):
            if rng.random() < 0.25: continue
            tt = t0 + (k * 1.5 % 8) * beat * 0.5 + rng.choice([0, beat/2])
            if tt >= DUR - 0.5: break
            note = int(rng.choice(scale))
            p = pluck(note, 1.4)
            i0 = int(tt * SR); i1 = min(N, i0 + len(p))
            mix[i0:i1, 0] += p[:i1-i0] * 0.75; mix[i0:i1, 1] += p[:i1-i0] * 0.95
            # feedback-ish echo
            te = tt + beat * 0.75
            if te < DUR - 0.5:
                i0 = int(te * SR); i1 = min(N, i0 + len(p))
                mix[i0:i1, 0] += p[:i1-i0] * 0.3; mix[i0:i1, 1] += p[:i1-i0] * 0.38
    return mix

def one_pole_lp(x, cutoff_norm):
    y = np.empty_like(x); acc = np.zeros(x.shape[1])
    a = cutoff_norm
    for i in range(x.shape[0]):
        acc = acc + a * (x[i] - acc); y[i] = acc
    return y

def one_pole_hp(x, cutoff_norm):
    return x - one_pole_lp(x, cutoff_norm)

def compress(x, thr_db=-18, ratio=3.0, attack=0.008, release=0.18, makeup_db=6.0):
    env = np.zeros(1)
    a_att = np.exp(-1 / (attack * SR)); a_rel = np.exp(-1 / (release * SR))
    mono = np.max(np.abs(x), axis=1)
    g = np.ones(len(mono))
    e = 0.0
    thr = 10 ** (thr_db / 20)
    for i in range(len(mono)):
        v = mono[i]
        if v > e: e = a_att * e + (1 - a_att) * v
        else: e = a_rel * e + (1 - a_rel) * v
        if e > thr:
            over = e / thr
            g[i] = over ** (-(1 - 1/ratio))
    return x * (g * 10 ** (makeup_db / 20))[:, None]

def soft_clip(x, drive=1.6):
    return np.tanh(x * drive) / np.tanh(drive * 0.9)

def limiter(x, ceil_db=-0.5):
    ceil = 10 ** (ceil_db / 20)
    peak = np.max(np.abs(x))
    if peak > ceil: x = x * (ceil / peak)
    return x

def raw_master(x):
    # dull, uncompressed, slightly quiet + hiss for "demo off the hard drive" feel
    y = one_pole_lp(x, 0.16)          # ~6.5 kHz feel, dark
    y = one_pole_hp(y, 0.004)         # loose low end
    y = y * (10 ** (-13/20) / max(np.max(np.abs(y)), 1e-9))
    y = y + np.random.default_rng(7).standard_normal(y.shape) * 10**(-46/20)
    return limiter(y, -1.5)

def mix_master(x):
    y = one_pole_hp(x, 0.006)         # tight lows
    y = compress(y, -18, 3.0, 0.008, 0.18, 5.5)
    y = soft_clip(y, 1.5)             # glue saturation
    # gentle air shelf via highpassed boost
    hp = one_pole_hp(y, 0.09)
    y = y + hp * 0.35
    # stereo widen on sides
    mid = (y[:,0] + y[:,1]) / 2; side = (y[:,0] - y[:,1]) / 2
    y = np.stack([mid + side*1.35, mid - side*1.35], axis=1)
    y = y * (10 ** (-1.5/20) / max(np.max(np.abs(y)), 1e-9))
    return limiter(y, -0.3)

def to_mp3(y):
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(96); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
    return enc.encode(pcm.tobytes()) + enc.flush()

for name, bpm, root, seed in TRACKS:
    session = render(name, bpm, root, seed)
    outs = {'raw': raw_master(session), 'mix': mix_master(session)}
    for kind, sig in outs.items():
        if kind == 'raw' and name not in ('no-ceilings', 'pressure', 'midnight-in-pompano'):
            continue
        mp3 = to_mp3(sig)
        path = f'public/audio/{name}-{kind}.mp3'
        with open(path, 'wb') as f: f.write(mp3)
        print(f'{path:42s} {len(mp3)/1024:7.1f} KB')
