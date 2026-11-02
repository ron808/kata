let audio: AudioContext | null = null;

/** Browsers only let a page make sound after a tap, so every tap in focus keeps this ready. */
export function wakeSound() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No sound here: the question on the screen still says it.
  }
}

/** Two soft notes: a timer ran out, or a task's time came. */
export function chime() {
  if (!audio) return;
  const ctx = audio;
  const start = ctx.currentTime;
  for (const [note, delay] of [
    [659.25, 0],
    [880, 0.2],
  ]) {
    const tone = ctx.createOscillator();
    const level = ctx.createGain();
    tone.type = "sine";
    tone.frequency.value = note;
    level.gain.setValueAtTime(0.0001, start + delay);
    level.gain.linearRampToValueAtTime(0.16, start + delay + 0.02);
    level.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.9);
    tone.connect(level).connect(ctx.destination);
    tone.start(start + delay);
    tone.stop(start + delay + 1);
  }
}
