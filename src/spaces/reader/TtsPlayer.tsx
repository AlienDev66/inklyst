import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function wordsOf(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function pickPortugueseVoice(voices: SpeechSynthesisVoice[]) {
  const pt = voices.filter((voice) => /^pt([-_]|$)/i.test(voice.lang));
  if (!pt.length) return null;

  const rank = (voice: SpeechSynthesisVoice) => {
    const bag = `${voice.name} ${voice.lang}`.toLowerCase();
    let score = 0;
    if (/pt-pt|portugal/.test(bag)) score += 8;
    if (/pt-br|brazil|brasil/.test(bag)) score += 6;
    if (/google|microsoft|enhanced|premium|natural/.test(bag)) score += 5;
    if (/luciana|francisca|duarte|maria|joana|ines|inês|fernanda|vit[oó]ria/.test(bag)) score += 4;
    if (/compact|eloquence|robot|whisper/.test(bag)) score -= 4;
    if (voice.localService) score += 1;
    return score;
  };

  return [...pt].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export function TtsPlayer({ text, title }: { text: string; title: string }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const words = useMemo(() => wordsOf(text), [text]);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<(typeof SPEEDS)[number]>(1);
  const [wordIndex, setWordIndex] = useState(0);
  const [voiceName, setVoiceName] = useState("voz do sistema");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef(rate);
  const wordRef = useRef(0);
  const playingRef = useRef(false);
  const runId = useRef(0);

  rateRef.current = rate;
  wordRef.current = wordIndex;

  useEffect(() => {
    if (!supported) return;

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      const picked = pickPortugueseVoice(voices);
      voiceRef.current = picked;
      setVoiceName(picked ? picked.name.replace(/\(.*\)/, "").trim() : "voz do sistema");
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      runId.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  useEffect(() => {
    runId.current += 1;
    window.speechSynthesis?.cancel();
    playingRef.current = false;
    setPlaying(false);
    setWordIndex(0);
    wordRef.current = 0;
  }, [text]);

  const duration = useMemo(() => {
    // ~155 wpm at 1x — scales with rate for the bar only
    const seconds = Math.max(1, Math.round((words.length / 155) * 60 / rate));
    return seconds;
  }, [words.length, rate]);

  const elapsed = words.length
    ? Math.min(duration, Math.round((wordIndex / words.length) * duration))
    : 0;

  function stopAll() {
    runId.current += 1;
    window.speechSynthesis.cancel();
    playingRef.current = false;
    setPlaying(false);
  }

  function speakFrom(startWord: number) {
    if (!supported || !words.length) return;
    const id = ++runId.current;
    window.speechSynthesis.cancel();

    const from = Math.max(0, Math.min(words.length - 1, startWord));
    wordRef.current = from;
    setWordIndex(from);

    // Chunk by ~40 words so rate/voice stay stable (long utterances sound broken).
    const CHUNK = 40;
    let cursor = from;

    const speakChunk = () => {
      if (id !== runId.current) return;
      if (cursor >= words.length) {
        playingRef.current = false;
        setPlaying(false);
        setWordIndex(0);
        wordRef.current = 0;
        return;
      }

      const end = Math.min(words.length, cursor + CHUNK);
      const slice = words.slice(cursor, end).join(" ");
      const chunkStart = cursor;
      const utterance = new SpeechSynthesisUtterance(slice);
      const voice = voiceRef.current;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "pt-PT";
      }
      utterance.rate = rateRef.current;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onboundary = (event) => {
        if (id !== runId.current) return;
        if (event.name !== "word") return;
        // charIndex is inside the chunk string
        const before = slice.slice(0, event.charIndex);
        const local = before.trim() ? before.trim().split(/\s+/).length : 0;
        const absolute = Math.min(words.length - 1, chunkStart + local);
        wordRef.current = absolute;
        setWordIndex(absolute);
      };

      utterance.onend = () => {
        if (id !== runId.current) return;
        cursor = end;
        wordRef.current = end;
        setWordIndex(end >= words.length ? 0 : end);
        if (end < words.length && playingRef.current) {
          speakChunk();
        } else {
          playingRef.current = false;
          setPlaying(false);
        }
      };

      utterance.onerror = () => {
        if (id !== runId.current) return;
        playingRef.current = false;
        setPlaying(false);
      };

      // Chrome sometimes stalls unless we kick resume after speak.
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        if (id === runId.current && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 40);
    };

    playingRef.current = true;
    setPlaying(true);
    speakChunk();
  }

  function toggle() {
    if (!supported) return;
    if (playingRef.current) {
      stopAll();
      return;
    }
    const start = wordRef.current >= words.length ? 0 : wordRef.current;
    speakFrom(start);
  }

  function skipWords(delta: number) {
    const next = Math.max(0, Math.min(words.length - 1, wordRef.current + delta));
    if (playingRef.current) {
      speakFrom(next);
    } else {
      wordRef.current = next;
      setWordIndex(next);
    }
  }

  function cycleSpeed() {
    const index = SPEEDS.indexOf(rate);
    const next = SPEEDS[(index + 1) % SPEEDS.length]!;
    rateRef.current = next;
    setRate(next);
    if (playingRef.current) {
      // Reinicia já com a nova velocidade a partir da palavra actual
      speakFrom(wordRef.current);
    }
  }

  if (!supported) return null;

  const progress = words.length ? Math.min(100, (wordIndex / words.length) * 100) : 0;
  const speedLabel = rate === 1 ? "1x" : `${rate}x`;

  return (
    <div className="tts-player" aria-label="Ouvir com voz">
      <button type="button" className="tts-play" aria-label={playing ? "Parar" : "Ouvir"} onClick={toggle}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="tts-copy">
        <strong>Ouvir esta página</strong>
        <small>
          {title} · {voiceName}
        </small>
      </div>
      <div className="tts-controls">
        <button type="button" aria-label="Recuar algumas palavras" onClick={() => skipWords(-12)}>
          <RotateCcw size={15} />
          <span>10</span>
        </button>
        <button type="button" aria-label="Avançar algumas palavras" onClick={() => skipWords(12)}>
          <RotateCw size={15} />
          <span>10</span>
        </button>
        <button
          type="button"
          className="tts-speed"
          aria-label={`Velocidade ${speedLabel}. Clique para mudar.`}
          onClick={cycleSpeed}
        >
          {speedLabel}
        </button>
      </div>
      <div className="tts-bar">
        <span>{formatTime(elapsed)}</span>
        <div className="tts-track">
          <i style={{ width: `${progress}%` }} />
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
