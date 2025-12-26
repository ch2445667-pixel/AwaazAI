
export enum Language {
  ENGLISH = 'English',
  URDU = 'Urdu',
  HINDI = 'Hindi'
}

export enum Voice {
  ACHERNAR = 'Achernar',
  ACHIRD = 'Achird',
  ALGENIB = 'Algenib',
  ALGIEBA = 'Algieba',
  ALNILAM = 'Alnilam',
  AOEDE = 'Aoede',
  AUTONOE = 'Autonoe',
  CALLIRRHOE = 'Callirrhoe',
  CHARON = 'Charon',
  DESPINA = 'Despina',
  ENCELADUS = 'Enceladus',
  ERINOME = 'Erinome',
  FENRIR = 'Fenrir',
  GACRUX = 'Gacrux',
  IAPETUS = 'Iapetus',
  KORE = 'Kore',
  LAOMEDEIA = 'Laomedeia',
  LEDA = 'Leda',
  ORUS = 'Orus',
  PULCHERRIMA = 'Pulcherrima',
  PUCK = 'Puck',
  RASALGETHI = 'Rasalgethi',
  SADACHBIA = 'SadACHBIA',
  SADALTAGER = 'Sadaltager',
  SCHEDAR = 'Schedar',
  SULAFAT = 'Sulafat',
  UMBRIEL = 'Umbriel',
  VINDEMIATRIX = 'Vindemiatrix',
  ZEPHYR = 'Zephyr',
  ZUBENELGENUBI = 'Zubenelgenubi'
}

export enum VoiceStyle {
  NEUTRAL = 'Neutral',
  DRAMATIC = 'Dramatic',
  CALM = 'Calm',
  ENERGETIC = 'Energetic',
  WHISPERING = 'Whispering',
  SHOUTING = 'Shouting',
  NARRATIVE = 'Narrative',
  AUTHORITATIVE = 'Authoritative',
  FRIENDLY = 'Friendly',
  SAD = 'Sad',
  EXCITED = 'Excited',
  SARCASTIC = 'Sarcastic',
  PROFESSIONAL = 'Professional',
  DEEP = 'Deep & Resonant',
  SUSPENSEFUL = 'Suspenseful',
  CHEERFUL = 'Cheerful',
  MYSTERIOUS = 'Mysterious',
  CASUAL = 'Casual',
  ROBOTIC = 'Robotic',
  ANGRY = 'Angry',
  FRIGHTENED = 'Frightened',
  PLEADING = 'Pleading'
}

export const VOICE_DETAILS: Record<Voice, { gender: 'Male' | 'Female' }> = {
  [Voice.ACHERNAR]: { gender: 'Female' },
  [Voice.ACHIRD]: { gender: 'Male' },
  [Voice.ALGENIB]: { gender: 'Male' },
  [Voice.ALGIEBA]: { gender: 'Male' },
  [Voice.ALNILAM]: { gender: 'Male' },
  [Voice.AOEDE]: { gender: 'Female' },
  [Voice.AUTONOE]: { gender: 'Female' },
  [Voice.CALLIRRHOE]: { gender: 'Female' },
  [Voice.CHARON]: { gender: 'Male' },
  [Voice.DESPINA]: { gender: 'Female' },
  [Voice.ENCELADUS]: { gender: 'Male' },
  [Voice.ERINOME]: { gender: 'Female' },
  [Voice.FENRIR]: { gender: 'Male' },
  [Voice.GACRUX]: { gender: 'Female' },
  [Voice.IAPETUS]: { gender: 'Male' },
  [Voice.KORE]: { gender: 'Female' },
  [Voice.LAOMEDEIA]: { gender: 'Female' },
  [Voice.LEDA]: { gender: 'Female' },
  [Voice.ORUS]: { gender: 'Male' },
  [Voice.PULCHERRIMA]: { gender: 'Female' },
  [Voice.PUCK]: { gender: 'Male' },
  [Voice.RASALGETHI]: { gender: 'Male' },
  [Voice.SADACHBIA]: { gender: 'Male' },
  [Voice.SADALTAGER]: { gender: 'Male' },
  [Voice.SCHEDAR]: { gender: 'Male' },
  [Voice.SULAFAT]: { gender: 'Female' },
  [Voice.UMBRIEL]: { gender: 'Male' },
  [Voice.VINDEMIATRIX]: { gender: 'Female' },
  [Voice.ZEPHYR]: { gender: 'Female' },
  [Voice.ZUBENELGENUBI]: { gender: 'Male' },
};

export const LANGUAGE_VOICE_MAP: Record<Language, Voice> = {
  [Language.ENGLISH]: Voice.KORE,
  [Language.URDU]: Voice.FENRIR,
  [Language.HINDI]: Voice.AOEDE,
};

export interface SpeakerConfig {
  name: string;
  voice: Voice;
}

export interface TTSRequest {
  text: string;
  style?: string;
  voice: Voice;
  pitch: number;
  speed: number;
}

export interface MultiTTSRequest {
  dialogue: string;
  speakers: SpeakerConfig[];
  pitch: number;
  speed: number;
}
