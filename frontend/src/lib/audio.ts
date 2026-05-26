// Synthesize high-quality organic sounds using Web Audio API

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Warm organic pluck sound for sending a tap
export const playSendSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create oscillators and gain nodes
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    // Gentle warm pentatonic frequency (C5 - ~523.25Hz)
    osc.frequency.setValueAtTime(523.25, now);
    // Smooth frequency slide down
    osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.15); // Slide to C4
    
    // Set smooth gain envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6); // Gentle decay
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};

// Double soft heartbeat sound for receiving a tap
export const playReceiveSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playPulse = (delay: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      // Low pass filter to make it sound muffled and warm like a real heartbeat
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now + delay);

      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.4, now + delay + 0.03); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22); // Fast decay

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    };

    // "Lub-dub" heartbeat double pulse
    playPulse(0, 68);     // First pulse at 68Hz
    playPulse(0.15, 62);  // Second pulse at 62Hz slightly lower pitch
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};
