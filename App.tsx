
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Language, 
  Voice, 
  LANGUAGE_VOICE_MAP, 
  SpeakerConfig,
  VOICE_DETAILS,
  VoiceStyle
} from './types';
import { generateTTSAudio, generateMultiTTSAudio } from './services/geminiService';
import { decodeBase64, decodePCMToAudioBuffer, audioBufferToWav } from './utils/audioProcessing';

const TAGS = [
  '[sigh]', '[laughing]', '[uhm]', '[sarcasm]', '[robotic]', 
  '[shouting]', '[whispering]', '[extremely fast]', 
  '[short pause]', '[medium pause]', '[long pause]', 
  '[scared]', '[curious]', '[bored]'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<Voice | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(LANGUAGE_VOICE_MAP[Language.ENGLISH]);
  const [script, setScript] = useState('');
  const [style, setStyle] = useState<VoiceStyle | string>(VoiceStyle.NEUTRAL);
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  // Multi Speaker State
  const [multiScript, setMultiScript] = useState('');
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([
    { name: 'Joe', voice: Voice.KORE },
    { name: 'Jane', voice: Voice.PUCK }
  ]);

  // Audio References
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const rawBufferRef = useRef<AudioBuffer | null>(null);

  const filteredVoices = useMemo(() => {
    return Object.values(Voice).filter(v => 
      genderFilter === 'All' || VOICE_DETAILS[v].gender === genderFilter
    );
  }, [genderFilter]);

  // Ensure selected voice is valid for current filter
  useEffect(() => {
    const isCurrentVoiceValid = filteredVoices.includes(selectedVoice);
    
    if (!isCurrentVoiceValid) {
      if (filteredVoices.length > 0) {
        setSelectedVoice(filteredVoices[0]);
      }
    }
  }, [genderFilter, filteredVoices]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const handleInsertTag = (tag: string, target: 'single' | 'multi') => {
    if (target === 'single') setScript(prev => prev + (prev.length ? ' ' : '') + tag + ' ');
    else setMultiScript(prev => prev + (prev.length ? ' ' : '') + tag + ' ');
  };

  const handlePreviewVoice = async (voice: Voice) => {
    if (previewingVoice) return;
    setPreviewingVoice(voice);
    try {
      // Previews are always 1x speed and 0 pitch for consistency
      const base64Data = await generateTTSAudio('Hello, this is a voice preview.', '', voice, 1.0, 0);
      if (base64Data) {
        const ctx = getAudioContext();
        const pcmBytes = decodeBase64(base64Data);
        const buffer = await decodePCMToAudioBuffer(pcmBytes, ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err: any) {
      console.error("Preview failed", err);
      setError(err.message || "Failed to preview voice.");
    } finally {
      setPreviewingVoice(null);
    }
  };

  const generate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      let base64Data: string | undefined;
      if (activeTab === 'single') {
        if (!script.trim()) throw new Error("Please enter some text below.");
        base64Data = await generateTTSAudio(script, style, selectedVoice, speed, pitch);
      } else {
        if (!multiScript.trim()) throw new Error("Please enter dialogue below.");
        base64Data = await generateMultiTTSAudio(multiScript, speakers, speed, pitch);
      }

      if (base64Data) {
        const ctx = getAudioContext();
        const pcmBytes = decodeBase64(base64Data);
        const buffer = await decodePCMToAudioBuffer(pcmBytes, ctx);
        rawBufferRef.current = buffer;
        
        const wavBlob = audioBufferToWav(buffer);
        const newUrl = URL.createObjectURL(wavBlob);
        
        // Revoke old URL if it exists
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(newUrl);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-[1400px] mx-auto bg-black">
      {/* App Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-black tracking-tighter text-white">
            Awaaz<span className="accent-jade">AI</span>
          </h1>
        </div>
        <p className="text-celestial text-sm font-medium opacity-70">
          Turn text into lifelike audio instantly.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => setActiveTab('single')}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'single' ? 'bg-jade text-black' : 'bg-navy text-white hover:bg-opacity-80'}`}
        >
          Single Speaker
        </button>
        <button 
          onClick={() => setActiveTab('multi')}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'multi' ? 'bg-jade text-black' : 'bg-navy text-white hover:bg-opacity-80'}`}
        >
          Conversation
        </button>
      </nav>

      <div className="flex flex-col xl:flex-row gap-6 flex-1">
        {/* Main Workspace (Editor) */}
        <main className="flex-1 flex flex-col glass-panel overflow-hidden shadow-xl">
          <div className="p-6 flex-1 flex flex-col bg-black/40">
            <textarea 
              className="w-full flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none text-white text-lg leading-relaxed custom-scrollbar placeholder:text-zinc-700 font-medium"
              placeholder={activeTab === 'single' ? "Type anything here..." : "Joe: Hi there!\nJane: Hello Joe!"}
              value={activeTab === 'single' ? script : multiScript}
              onChange={(e) => activeTab === 'single' ? setScript(e.target.value) : setMultiScript(e.target.value)}
            />
            
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-navy">
              {TAGS.map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleInsertTag(tag, activeTab)}
                  className="px-3 py-1 bg-navy border border-transparent rounded-md text-[10px] font-bold text-celestial hover:border-jade hover:text-jade transition-all active:scale-95 whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Output Area */}
          {audioUrl && (
            <div className="bg-navy/50 p-6 border-t border-jade/10">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-circle-check text-jade text-sm"></i>
                    <span className="text-sm font-bold text-jade">Audio Ready</span>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <audio 
                      key={audioUrl}
                      controls 
                      className="flex-1 min-w-[200px] h-10 rounded-full"
                      src={audioUrl}
                    />
                    <a 
                      href={audioUrl} 
                      download="awaaz_ai_audio.wav"
                      className="p-2.5 bg-celestial text-black rounded-full hover:scale-105 transition-transform"
                      title="Download"
                    >
                      <i className="fa-solid fa-download"></i>
                    </a>
                  </div>
               </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-sm font-bold border-t border-red-500/20 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}
        </main>

        {/* Sidebar (Settings) */}
        <aside className="w-full xl:w-[350px] flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col gap-6 bg-[#050505]">
            <header className="flex justify-between items-center border-b border-navy pb-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-jade">Voice Controls</h2>
              <i className="fa-solid fa-sliders text-jade text-sm"></i>
            </header>

            <div className="space-y-6">
              {/* Gender Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-celestial uppercase tracking-widest opacity-60">Voice Gender</label>
                <div className="flex gap-1 p-1 bg-navy/30 rounded-lg">
                  {(['All', 'Male', 'Female'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${genderFilter === g ? 'bg-jade text-black' : 'text-celestial hover:text-white'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language & Voice Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-celestial uppercase tracking-widest opacity-60">Language & Speaker</label>
                {activeTab === 'single' ? (
                  <div className="grid grid-cols-1 gap-2">
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full bg-navy/40 border border-navy/50 rounded-lg px-4 py-2.5 text-xs text-white font-bold outline-none"
                    >
                      {Object.values(Language).map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    
                    <div className="flex gap-2">
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value as Voice)}
                        className="flex-1 bg-navy/40 border border-navy/50 rounded-lg px-4 py-2.5 text-xs text-jade font-black outline-none"
                      >
                        {filteredVoices.map(v => (
                          <option key={v} value={v}>{v} ({VOICE_DETAILS[v].gender})</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handlePreviewVoice(selectedVoice)}
                        disabled={!!previewingVoice}
                        title="Preview Voice"
                        className="w-10 h-10 flex items-center justify-center bg-navy/50 border border-navy/50 rounded-lg text-jade hover:bg-jade hover:text-black transition-all disabled:opacity-50"
                      >
                        {previewingVoice === selectedVoice ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        ) : (
                          <i className="fa-solid fa-play text-xs"></i>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {speakers.map((s, idx) => (
                      <div key={idx} className="p-3 bg-navy/20 rounded-lg space-y-2 border border-jade/5">
                         <div className="flex items-center gap-2">
                           <input 
                             className="bg-transparent text-xs font-black text-white outline-none w-full border-b border-white/5 focus:border-jade pb-1"
                             value={s.name}
                             placeholder="Speaker Name"
                             onChange={(e) => {
                               const ns = [...speakers];
                               ns[idx].name = e.target.value;
                               setSpeakers(ns);
                             }}
                           />
                         </div>
                         <div className="flex gap-2">
                            <select 
                                value={s.voice}
                                onChange={(e) => {
                                  const ns = [...speakers];
                                  ns[idx].voice = e.target.value as Voice;
                                  setSpeakers(ns);
                                }}
                                className="flex-1 bg-black/40 rounded-md px-2 py-1.5 text-[10px] text-jade font-bold outline-none"
                              >
                                {Object.values(Voice).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <button 
                              onClick={() => handlePreviewVoice(s.voice)}
                              disabled={!!previewingVoice}
                              title="Preview Voice"
                              className="w-8 h-8 flex items-center justify-center bg-navy/50 rounded-md text-jade hover:bg-jade hover:text-black transition-all disabled:opacity-50"
                            >
                              {previewingVoice === s.voice ? (
                                <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
                              ) : (
                                <i className="fa-solid fa-play text-[10px]"></i>
                              )}
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preset Voice Style Selector (Single Speaker) */}
              {activeTab === 'single' && (
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black text-celestial uppercase tracking-widest opacity-60">Voice Style</label>
                  <select 
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-navy/40 border border-navy/50 rounded-lg px-4 py-2.5 text-xs text-white font-bold outline-none"
                  >
                    {Object.values(VoiceStyle).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="Custom">-- Custom Style --</option>
                  </select>
                  
                  {style === 'Custom' && (
                    <input 
                      type="text"
                      placeholder="e.g. Whispering, Dramatic"
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full mt-2 bg-navy/20 rounded-lg px-4 py-2 text-xs text-white outline-none border border-navy/30 focus:border-jade"
                    />
                  )}
                </div>
              )}

              {/* Sliders */}
              <div className="space-y-6 pt-4 border-t border-navy/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-celestial uppercase tracking-widest opacity-60">Pitch</label>
                    <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-md font-black text-[10px]">{pitch > 0 ? `+${pitch}` : pitch}</span>
                  </div>
                  <input 
                    type="range" min="-10" max="10" step="0.5"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-celestial uppercase tracking-widest opacity-60">Speed</label>
                    <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-md font-black text-[10px]">{speed.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2.0" step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={generate}
            disabled={isGenerating || (activeTab === 'single' ? !script.trim() : !multiScript.trim())}
            className="w-full py-4 btn-primary rounded-xl text-sm uppercase tracking-widest shadow-lg disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <><i className="fa-solid fa-spinner fa-spin"></i><span>Synthesizing</span></>
            ) : (
              <><i className="fa-solid fa-bolt-lightning"></i><span>Generate Audio</span></>
            )}
          </button>
        </aside>
      </div>

      {/* Footer Enhancement */}
      <footer className="mt-8 py-6 border-t border-navy/30 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <span className="text-jade animate-pulse">●</span>
          <span>Powered by Gemini AI Engine</span>
        </div>
        <div className="text-center group cursor-default">
          Crafted with passion by <span className="text-celestial group-hover:text-jade transition-colors duration-300">Muhammad Tanzeel</span>
        </div>
        <div className="flex items-center gap-2">
          <span>© 2026 AwaazAI</span>
          <span className="text-navy">/</span>
          <span>Ultra High-Fidelity</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
