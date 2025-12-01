export interface Client {
  id: string;
  name: string;
  age: number;
  diagnosisDate: Date;
  therapist: string;
  status: 'Active' | 'Inactive' | 'Discharged';
}

export interface Program {
  id: string;
  name: string;
  category: 'Communication' | 'Social Skills' | 'Self-Care' | 'Behavioral' | 'Academic';
  targetCount: number;
}

export interface Target {
  id: string;
  programId: string;
  name: string;
  mastery: number; // 0-100
  trials: number;
  successRate: number;
}

export interface DataPoint {
  date: Date;
  clientId: string;
  programId: string;
  targetId: string;
  correct: number;
  incorrect: number;
  sessionDuration: number; // minutes
}

const clientNames = [
  'Emma Johnson', 'Liam Smith', 'Olivia Williams', 'Noah Brown', 'Ava Davis',
  'Ethan Miller', 'Sophia Wilson', 'Mason Moore', 'Isabella Taylor', 'Lucas Anderson',
  'Mia Thomas', 'Oliver Jackson', 'Charlotte White', 'Elijah Harris', 'Amelia Martin',
  'James Thompson', 'Harper Garcia', 'Benjamin Martinez', 'Evelyn Robinson', 'Alexander Clark'
];

const therapists = [
  'Dr. Sarah Mitchell', 'Dr. John Peterson', 'Dr. Emily Chen', 'Dr. Michael Rodriguez',
  'Dr. Jessica Lee', 'Dr. David Kim', 'Dr. Amanda Wilson'
];

const programs: Program[] = [
  { id: 'p1', name: 'Requesting', category: 'Communication', targetCount: 12 },
  { id: 'p2', name: 'Labeling', category: 'Communication', targetCount: 15 },
  { id: 'p3', name: 'Social Greetings', category: 'Social Skills', targetCount: 8 },
  { id: 'p4', name: 'Turn-Taking', category: 'Social Skills', targetCount: 10 },
  { id: 'p5', name: 'Independent Dressing', category: 'Self-Care', targetCount: 6 },
  { id: 'p6', name: 'Hand Washing', category: 'Self-Care', targetCount: 5 },
  { id: 'p7', name: 'On-Task Behavior', category: 'Behavioral', targetCount: 7 },
  { id: 'p8', name: 'Following Instructions', category: 'Behavioral', targetCount: 9 },
  { id: 'p9', name: 'Number Recognition', category: 'Academic', targetCount: 20 },
  { id: 'p10', name: 'Letter Identification', category: 'Academic', targetCount: 26 },
  { id: 'p11', name: 'Sharing', category: 'Social Skills', targetCount: 6 },
  { id: 'p12', name: 'Emotion Recognition', category: 'Social Skills', targetCount: 8 },
];

const targetTemplates = {
  'Requesting': ['Request for water', 'Request for snack', 'Request for break', 'Request for toy', 'Request for help'],
  'Labeling': ['Label colors', 'Label animals', 'Label body parts', 'Label objects', 'Label actions'],
  'Social Greetings': ['Wave hello', 'Say goodbye', 'Eye contact during greeting', 'Respond to name'],
  'Turn-Taking': ['Wait for turn', 'Share materials', 'Participate in group activity'],
  'Independent Dressing': ['Put on shirt', 'Put on pants', 'Put on shoes', 'Zip jacket'],
  'Hand Washing': ['Turn on water', 'Apply soap', 'Scrub hands', 'Rinse', 'Dry hands'],
  'On-Task Behavior': ['Sit at table', 'Attend to task', 'Complete task', 'Transition appropriately'],
  'Following Instructions': ['1-step instruction', '2-step instruction', '3-step instruction'],
  'Number Recognition': Array.from({ length: 20 }, (_, i) => `Identify ${i + 1}`),
  'Letter Identification': Array.from({ length: 26 }, (_, i) => `Identify ${String.fromCharCode(65 + i)}`),
  'Sharing': ['Share toy', 'Share materials', 'Take turns with peer'],
  'Emotion Recognition': ['Happy', 'Sad', 'Angry', 'Surprised', 'Scared', 'Excited'],
};

function generateTargetsForProgram(program: Program): Target[] {
  const templates = targetTemplates[program.name as keyof typeof targetTemplates] || [];
  const targets: Target[] = [];

  for (let i = 0; i < program.targetCount; i++) {
    const mastery = Math.random() * 100;
    targets.push({
      id: `${program.id}-t${i + 1}`,
      programId: program.id,
      name: templates[i] || `Target ${i + 1}`,
      mastery,
      trials: Math.floor(Math.random() * 200) + 50,
      successRate: mastery,
    });
  }

  return targets;
}

export function generateClients(): Client[] {
  return clientNames.map((name, i) => ({
    id: `c${i + 1}`,
    name,
    age: Math.floor(Math.random() * 10) + 3,
    diagnosisDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1),
    therapist: therapists[Math.floor(Math.random() * therapists.length)],
    status: i < 17 ? 'Active' : (i < 19 ? 'Inactive' : 'Discharged'),
  }));
}

export function generatePrograms(): Program[] {
  return programs;
}

export function generateTargets(): Target[] {
  return programs.flatMap(generateTargetsForProgram);
}

export function generateDataPoints(clients: Client[], targets: Target[]): DataPoint[] {
  const dataPoints: DataPoint[] = [];
  const startDate = new Date(2024, 0, 1);
  const endDate = new Date(2024, 11, 1);

  clients.forEach(client => {
    if (client.status === 'Discharged') return;

    // Each client has data for 3-6 programs
    const clientPrograms = programs
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 3);

    clientPrograms.forEach(program => {
      const programTargets = targets.filter(t => t.programId === program.id);

      // Generate data for each target over time
      programTargets.forEach(target => {
        const sessionCount = Math.floor(Math.random() * 60) + 20;

        for (let session = 0; session < sessionCount; session++) {
          const sessionDate = new Date(
            startDate.getTime() +
            Math.random() * (endDate.getTime() - startDate.getTime())
          );

          // Simulate learning curve - performance improves over time
          const timeProgress = (sessionDate.getTime() - startDate.getTime()) /
                              (endDate.getTime() - startDate.getTime());
          const baseSuccessRate = target.mastery / 100;
          const learningBonus = timeProgress * 0.3;
          const successProbability = Math.min(0.95, baseSuccessRate + learningBonus);

          const trials = Math.floor(Math.random() * 15) + 5;
          const correct = Math.floor(trials * (successProbability + (Math.random() - 0.5) * 0.2));

          dataPoints.push({
            date: sessionDate,
            clientId: client.id,
            programId: program.id,
            targetId: target.id,
            correct: Math.max(0, Math.min(trials, correct)),
            incorrect: trials - Math.max(0, Math.min(trials, correct)),
            sessionDuration: Math.floor(Math.random() * 30) + 15,
          });
        }
      });
    });
  });

  return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const clients = generateClients();
export const allPrograms = generatePrograms();
export const allTargets = generateTargets();
export const dataPoints = generateDataPoints(clients, allTargets);
