import { Annotation } from '@langchain/langgraph';

export const InterviewState = Annotation.Root({
  sessionId: Annotation({ default: () => '' }),
  interviewType: Annotation({ default: () => 'behavioral' }),
  candidateProfile: Annotation({
    default: () => ({ name: '', jobRole: '', experienceLevel: 'mid' }),
  }),
  transcript: Annotation({ default: () => [] }),
  currentTopic: Annotation({ default: () => '' }),
  difficultyLevel: Annotation({ default: () => 2 }),
  topicsCovered: Annotation({ default: () => [] }),
  lastAnswerQuality: Annotation({ default: () => null }),
  shouldClose: Annotation({ default: () => false }),
  nextInstruction: Annotation({ default: () => null }),
  turnCount: Annotation({ default: () => 0 }),
  startedAt: Annotation({ default: () => null }),
  flaggedClaims: Annotation({ default: () => [] }),
  surpriseUsed: Annotation({ default: () => false }),
});

// Unchanged — still used directly by difficultyAdjuster and graph.initializeState
export const topicBanks = {
  behavioral: [
    'teamwork and collaboration', 'conflict resolution', 'leadership experience',
    'handling failure', 'time management under pressure', 'adaptability to change',
    'giving and receiving feedback', 'cross-functional communication',
  ],
  technical: [
    'data structures and algorithms', 'system design fundamentals', 'object-oriented design',
    'database design and SQL', 'API design and REST principles', 'concurrency and parallelism',
    'testing strategies', 'code review and refactoring',
  ],
  system_design: [
    'scalability and load balancing', 'caching strategies', 'database sharding and replication',
    'microservices vs monolith', 'event-driven architecture', 'distributed consensus',
    'CDN and edge computing', 'rate limiting and throttling',
  ],
  hr_culture_fit: [
    'motivation and career goals', 'working style and preferences', 'company culture alignment',
    'handling ambiguity', 'growth mindset', 'work-life integration',
    'diversity and inclusion', 'long-term vision',
  ],
};

// Kept for any code still importing defaultState directly (e.g. graph.initializeState)
export const defaultState = {
  sessionId: '', interviewType: 'behavioral',
  candidateProfile: { name: '', jobRole: '', experienceLevel: 'mid' },
  transcript: [], currentTopic: '', difficultyLevel: 2, topicsCovered: [],
  lastAnswerQuality: null, shouldClose: false, nextInstruction: null,
  turnCount: 0, startedAt: null, flaggedClaims: [], surpriseUsed: false,
};