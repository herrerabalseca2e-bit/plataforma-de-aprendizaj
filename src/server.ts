import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

type SubjectId = 'matematica' | 'historia' | 'lengua' | 'ciencias';
type UserRole = 'docente' | 'estudiante' | 'administrador';

interface SubjectProgress {
  lessonCompleted: boolean;
  completedActivities: number[];
  latestScore: number;
  bestScore: number;
  stars: number;
  feedback: string;
  quizzesTaken: number;
}

interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StoredUserRecord {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  progress: Record<SubjectId, SubjectProgress>;
  completedVideoIds: string[];
}

interface StoredVideoRecord {
  id: string;
  subjectId: SubjectId;
  name: string;
  type: string;
  uploadedAt: string;
  fileName: string;
}

const browserDistFolder = join(import.meta.dirname, '../browser');
const storageFolder =
  process.env['STORAGE_DIR'] ||
  (process.env['VERCEL'] ? join('/tmp', 'app-storage') : join(process.cwd(), 'app-storage'));
const uploadFolder = join(storageFolder, 'uploaded-videos');
const videosFile = join(storageFolder, 'videos.json');
const usersFile = join(storageFolder, 'users.json');
const quizzesFile = join(storageFolder, 'quizzes.json');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '200mb' }));

function createDefaultQuizzes(): Record<SubjectId, QuizQuestion[]> {
  return {
    matematica: [
      {
        prompt: 'Si tienes 4 globos y te regalan 3 mas, cuantos globos tienes?',
        options: ['5', '6', '7', '8'],
        correctIndex: 2,
        explanation: '4 + 3 = 7. Cuando juntamos cantidades estamos sumando.',
      },
      {
        prompt: 'Cual es el resultado de 9 - 4?',
        options: ['3', '4', '5', '6'],
        correctIndex: 2,
        explanation: '9 - 4 = 5. Restar es quitar una cantidad.',
      },
      {
        prompt: 'Que operacion sirve para juntar cantidades?',
        options: ['Resta', 'Suma', 'Division', 'Comparacion'],
        correctIndex: 1,
        explanation: 'La suma se usa para reunir cantidades.',
      },
      {
        prompt: 'Si Ana tiene 6 cuadernos y pierde 2, cuantos le quedan?',
        options: ['8', '5', '4', '3'],
        correctIndex: 2,
        explanation: '6 - 2 = 4. A Ana le quedan 4 cuadernos.',
      },
      {
        prompt: 'Cual numero falta en la serie 2, 4, 6, __, 10?',
        options: ['7', '8', '9', '12'],
        correctIndex: 1,
        explanation: 'La serie aumenta de 2 en 2, por eso sigue el 8.',
      },
    ],
    historia: [
      {
        prompt: 'Para que sirve una linea del tiempo?',
        options: ['Para medir peso', 'Para ordenar hechos', 'Para sumar numeros', 'Para jugar futbol'],
        correctIndex: 1,
        explanation: 'La linea del tiempo organiza hechos del pasado en orden.',
      },
      {
        prompt: 'Que lugar guarda objetos e historias del pasado?',
        options: ['Museo', 'Parque', 'Mercado', 'Hospital'],
        correctIndex: 0,
        explanation: 'En el museo podemos conocer objetos e historias antiguas.',
      },
      {
        prompt: 'La historia ayuda a:',
        options: ['Entender cambios del pasado', 'Olvidar lo ocurrido', 'No leer', 'Resolver sumas'],
        correctIndex: 0,
        explanation: 'La historia explica como cambiaron las personas, lugares y costumbres.',
      },
      {
        prompt: 'Si un hecho ocurrio hace mucho tiempo, pertenece al:',
        options: ['Pasado', 'Futuro', 'Recreo', 'Juego'],
        correctIndex: 0,
        explanation: 'El pasado incluye hechos que ya ocurrieron.',
      },
      {
        prompt: 'Quien puede contarte recuerdos de cuando era pequeno?',
        options: ['Un familiar', 'Una mesa', 'Una regla', 'Un numero'],
        correctIndex: 0,
        explanation: 'Los familiares pueden compartir historias y recuerdos.',
      },
    ],
    lengua: [
      {
        prompt: 'Que parte del cuento presenta el problema principal?',
        options: ['Titulo', 'Nudo', 'Portada', 'Dedicatoria'],
        correctIndex: 1,
        explanation: 'El nudo desarrolla el problema principal del cuento.',
      },
      {
        prompt: 'El desenlace de una historia:',
        options: ['Inicia la historia', 'Explica el titulo', 'Resuelve o cierra el conflicto', 'Presenta al autor'],
        correctIndex: 2,
        explanation: 'El desenlace es el cierre de la historia.',
      },
      {
        prompt: 'Comprender un texto significa:',
        options: ['Leer sin pensar', 'Entender sus ideas principales', 'Copiarlo completo', 'Saltar parrafos'],
        correctIndex: 1,
        explanation: 'Comprender es entender lo que el texto quiere comunicar.',
      },
      {
        prompt: 'Quien vive los hechos dentro del cuento?',
        options: ['El narrador y los personajes', 'Solo el lector', 'El editor', 'Nadie'],
        correctIndex: 0,
        explanation: 'Los personajes viven la historia y el narrador la cuenta.',
      },
      {
        prompt: 'Un final alternativo es:',
        options: ['Otra forma de cerrar la historia', 'Una portada distinta', 'Un resumen del cuento', 'Una regla ortografica'],
        correctIndex: 0,
        explanation: 'Es una nueva propuesta para terminar la historia.',
      },
    ],
    ciencias: [
      {
        prompt: 'Que lugar de la comunidad se relaciona con aprender?',
        options: ['Hospital', 'Escuela', 'Mercado', 'Parqueadero'],
        correctIndex: 1,
        explanation: 'La escuela es el lugar donde aprendemos.',
      },
      {
        prompt: 'Para que sirven las normas?',
        options: ['Para convivir mejor', 'Para correr sin orden', 'Para olvidar responsabilidades', 'Para jugar sin respeto'],
        correctIndex: 0,
        explanation: 'Las normas ayudan a convivir con respeto y orden.',
      },
      {
        prompt: 'Quien cuida la salud de las personas en la comunidad?',
        options: ['Medico', 'Panadero', 'Pintor', 'Piloto'],
        correctIndex: 0,
        explanation: 'El medico ayuda a cuidar la salud de las personas.',
      },
      {
        prompt: 'Una buena convivencia significa:',
        options: ['Gritar siempre', 'Respetar a los demas', 'No escuchar a nadie', 'Romper reglas'],
        correctIndex: 1,
        explanation: 'Respetar y escuchar mejora la convivencia.',
      },
      {
        prompt: 'Cual es una norma positiva del aula?',
        options: ['Empujar a los companeros', 'Escuchar cuando otro habla', 'Tirar papeles al piso', 'No compartir materiales'],
        correctIndex: 1,
        explanation: 'Escuchar cuando otro habla demuestra respeto.',
      },
    ],
  };
}

function createEmptyProgress(): Record<SubjectId, SubjectProgress> {
  return {
    matematica: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    historia: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    lengua: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    ciencias: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
  };
}

async function ensureStorage() {
  await mkdir(storageFolder, { recursive: true });
  await mkdir(uploadFolder, { recursive: true });

  if (!existsSync(videosFile)) {
    await writeFile(videosFile, '[]', 'utf-8');
  }

  if (!existsSync(usersFile)) {
    await writeFile(usersFile, '[]', 'utf-8');
  }

  if (!existsSync(quizzesFile)) {
    await writeFile(quizzesFile, JSON.stringify(createDefaultQuizzes(), null, 2), 'utf-8');
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureStorage();

  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T) {
  await ensureStorage();
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readUsers() {
  const users = await readJsonFile<StoredUserRecord[]>(usersFile, []);
  return users.map((user) => ({
    ...user,
    progress: {
      ...createEmptyProgress(),
      ...user.progress,
    },
    completedVideoIds: user.completedVideoIds ?? [],
  }));
}

async function writeUsers(users: StoredUserRecord[]) {
  await writeJsonFile(usersFile, users);
}

async function readVideos() {
  return readJsonFile<StoredVideoRecord[]>(videosFile, []);
}

async function writeVideos(videos: StoredVideoRecord[]) {
  await writeJsonFile(videosFile, videos);
}

async function readQuizzes() {
  const quizzes = await readJsonFile<Record<SubjectId, QuizQuestion[]>>(quizzesFile, createDefaultQuizzes());
  return {
    ...createDefaultQuizzes(),
    ...quizzes,
  };
}

async function writeQuizzes(quizzes: Record<SubjectId, QuizQuestion[]>) {
  await writeJsonFile(quizzesFile, quizzes);
}

function safeExtension(fileName: string, mimeType: string) {
  const fileExt = extname(fileName).toLowerCase();
  if (fileExt) {
    return fileExt.replace(/[^.a-z0-9]/gi, '');
  }

  if (mimeType.includes('webm')) {
    return '.webm';
  }
  if (mimeType.includes('ogg')) {
    return '.ogv';
  }

  return '.mp4';
}

function sanitizeUser(user: StoredUserRecord) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    progress: user.progress,
    completedVideoIds: user.completedVideoIds ?? [],
  };
}

function sanitizeStudentProgress(user: StoredUserRecord) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    progress: user.progress,
    completedVideoIds: user.completedVideoIds ?? [],
  };
}

app.use('/uploaded-videos', express.static(uploadFolder, { index: false, redirect: false }));

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').trim();
  const role = String(req.body?.role ?? 'estudiante') as UserRole;

  if (!name) {
    res.status(400).json({ message: 'Ups, te equivocaste: falta el nombre del usuario.' });
    return;
  }

  if (!email) {
    res.status(400).json({ message: 'Ups, te equivocaste: falta el correo.' });
    return;
  }

  if (!password || password.length < 4) {
    res.status(400).json({ message: 'Ups, te equivocaste: la contrasena debe tener al menos 4 caracteres.' });
    return;
  }

  const users = await readUsers();
  const exists = users.some((user) => user.email === email);
  if (exists) {
    res.status(409).json({ message: 'Ups, te equivocaste: ese correo ya esta registrado.' });
    return;
  }

  const nextUser: StoredUserRecord = {
    name,
    email,
    password,
    role,
    progress: createEmptyProgress(),
    completedVideoIds: [],
  };

  users.push(nextUser);
  await writeUsers(users);
  res.status(201).json({ user: sanitizeUser(nextUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').trim();

  if (!email || !password) {
    res.status(400).json({ message: 'Ups, te equivocaste: debes escribir correo y contrasena.' });
    return;
  }

  const users = await readUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    res.status(404).json({ message: 'Ups, te equivocaste: ese correo no existe.' });
    return;
  }

  if (user.password !== password) {
    res.status(401).json({ message: 'Ups, te equivocaste: la contrasena no coincide.' });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

app.get('/api/users/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const users = await readUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    res.status(404).json({ message: 'Usuario no encontrado.' });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

app.get('/api/students', async (_req, res) => {
  const users = await readUsers();
  const students = users
    .filter((item) => item.role === 'estudiante')
    .map((item) => sanitizeStudentProgress(item));

  res.json({ students });
});

app.get('/api/quizzes', async (_req, res) => {
  const quizzes = await readQuizzes();
  res.json({ quizzes });
});

app.put('/api/quizzes/:subjectId', async (req, res) => {
  const subjectId = req.params.subjectId as SubjectId;
  const quiz = req.body?.quiz as QuizQuestion[] | undefined;
  const allowedSubjects = new Set(['matematica', 'historia', 'lengua', 'ciencias']);

  if (!allowedSubjects.has(subjectId)) {
    res.status(400).json({ message: 'Asignatura no valida.' });
    return;
  }

  if (!quiz || !Array.isArray(quiz) || quiz.length < 5) {
    res.status(400).json({ message: 'La evaluacion debe tener al menos 5 preguntas.' });
    return;
  }

  const invalidQuestion = quiz.some(
    (question) =>
      !question?.prompt ||
      !question?.explanation ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      question.options.some((option) => !String(option).trim()) ||
      typeof question.correctIndex !== 'number' ||
      question.correctIndex < 0 ||
      question.correctIndex > 3,
  );

  if (invalidQuestion) {
    res.status(400).json({ message: 'Cada pregunta debe tener 4 opciones, una respuesta correcta y una explicacion.' });
    return;
  }

  const quizzes = await readQuizzes();
  quizzes[subjectId] = quiz.map((question) => ({
    prompt: String(question.prompt).trim(),
    options: question.options.map((option) => String(option).trim()),
    correctIndex: question.correctIndex,
    explanation: String(question.explanation).trim(),
  }));

  await writeQuizzes(quizzes);
  res.json({ quiz: quizzes[subjectId] });
});

app.patch('/api/users/:email/progress', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const subjectId = req.body?.subjectId as SubjectId;
  const progress = req.body?.progress as SubjectProgress;

  const allowedSubjects = new Set(['matematica', 'historia', 'lengua', 'ciencias']);
  if (!allowedSubjects.has(subjectId) || !progress) {
    res.status(400).json({ message: 'Datos de progreso no validos.' });
    return;
  }

  const users = await readUsers();
  const userIndex = users.findIndex((item) => item.email === email);
  if (userIndex === -1) {
    res.status(404).json({ message: 'Usuario no encontrado.' });
    return;
  }

  users[userIndex] = {
    ...users[userIndex],
    progress: {
      ...users[userIndex].progress,
      [subjectId]: progress,
    },
  };

  await writeUsers(users);
  res.json({ user: sanitizeUser(users[userIndex]) });
});

app.post('/api/users/:email/videos/:videoId/complete', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const videoId = req.params.videoId;

  const users = await readUsers();
  const userIndex = users.findIndex((item) => item.email === email);
  if (userIndex === -1) {
    res.status(404).json({ message: 'Usuario no encontrado.' });
    return;
  }

  const completed = new Set(users[userIndex].completedVideoIds ?? []);
  completed.add(videoId);

  users[userIndex] = {
    ...users[userIndex],
    completedVideoIds: Array.from(completed),
  };

  await writeUsers(users);
  res.json({ user: sanitizeUser(users[userIndex]) });
});

app.get('/api/videos', async (_req, res) => {
  const records = await readVideos();
  res.json(
    records.map((record) => ({
      ...record,
      url: `/uploaded-videos/${record.fileName}`,
    })),
  );
});

app.post('/api/videos', async (req, res) => {
  const { subjectId, name, type, dataBase64 } = req.body ?? {};

  if (!subjectId || !name || !type || !dataBase64) {
    res.status(400).json({ message: 'Faltan datos del video.' });
    return;
  }

  const allowedSubjects = new Set(['matematica', 'historia', 'lengua', 'ciencias']);
  if (!allowedSubjects.has(subjectId)) {
    res.status(400).json({ message: 'Asignatura no valida.' });
    return;
  }

  const base64Payload = String(dataBase64).includes(',')
    ? String(dataBase64).split(',').pop() ?? ''
    : String(dataBase64);

  const buffer = Buffer.from(base64Payload, 'base64');
  const extension = safeExtension(String(name), String(type));
  const id = randomUUID();
  const fileName = `${id}${extension}`;

  await ensureStorage();
  await writeFile(join(uploadFolder, fileName), buffer);

  const records = await readVideos();
  const nextRecord: StoredVideoRecord = {
    id,
    subjectId,
    name,
    type,
    uploadedAt: new Date().toISOString(),
    fileName,
  };

  records.push(nextRecord);
  await writeVideos(records);

  res.status(201).json({
    ...nextRecord,
    url: `/uploaded-videos/${fileName}`,
  });
});

app.delete('/api/videos/:id', async (req, res) => {
  const { id } = req.params;
  const records = await readVideos();
  const record = records.find((item) => item.id === id);

  if (!record) {
    res.status(404).json({ message: 'Video no encontrado.' });
    return;
  }

  const filePath = join(uploadFolder, record.fileName);
  try {
    await stat(filePath);
    await unlink(filePath);
  } catch {
    // continue
  }

  await writeVideos(records.filter((item) => item.id !== id));
  res.status(204).end();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
export default reqHandler;
