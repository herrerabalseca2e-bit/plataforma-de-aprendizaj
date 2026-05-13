import { DatePipe } from '@angular/common';
import { Component, NgZone, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment.generated';

type SubjectId = 'matematica' | 'historia' | 'lengua' | 'ciencias';
type UserRole = 'docente' | 'estudiante' | 'gerente';

interface ExampleBlock {
  title: string;
  text: string;
}

interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface SubjectContent {
  id: SubjectId;
  name: string;
  shortName: string;
  tagline: string;
  about: string;
  color: string;
  mascot: string;
  mascotName: string;
  image: string;
  bannerTitle: string;
  lessonTitle: string;
  introduction: string;
  explanation: string;
  examples: ExampleBlock[];
  activities: string[];
  quiz: QuizQuestion[];
}

interface SubjectProgress {
  lessonCompleted: boolean;
  completedActivities: number[];
  latestScore: number;
  bestScore: number;
  stars: number;
  feedback: string;
  quizzesTaken: number;
}

interface StoredUser {
  name: string;
  email: string;
  role: UserRole;
  progress: Record<SubjectId, SubjectProgress>;
  completedVideoIds: string[];
}

interface StudentProgressRecord {
  name: string;
  email: string;
  role: UserRole;
  progress: Record<SubjectId, SubjectProgress>;
  completedVideoIds: string[];
}

interface SubjectVideo {
  id: string;
  subjectId: SubjectId;
  name: string;
  type: string;
  uploadedAt: string;
  url: string;
}

interface LocalSubjectVideo {
  id: string;
  subjectId: SubjectId;
  name: string;
  type: string;
  uploadedAt: string;
  fileName: string;
}

interface QuizSession {
  subjectId: SubjectId;
  currentQuestionIndex: number;
  answers: number[];
  score: number;
  secondsLeft: number;
  finished: boolean;
  lastExplanation: string;
  lastAnswerCorrect: boolean | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error?: {
    status: number;
    message: string;
  };
}

const SESSION_STORAGE_KEY = 'school-platform-session';
const QUIZ_DURATION_SECONDS = 5 * 60;

function apiUrl(path: string): string {
  if (environment.apiUrl) {
    return `${environment.apiUrl.replace(/\/$/, '')}${path}`;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '4200') {
    return `http://localhost:4000${path}`;
  }

  return path;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly subjectsVersion = signal(0);

  protected readonly schoolName = 'Aula Escolar Infantil';
  protected readonly roles: { value: UserRole; label: string }[] = [
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'docente', label: 'Docente' },
    { value: 'gerente', label: 'Gerente' }
  ];

  protected readonly subjects: SubjectContent[] = [
    {
      id: 'matematica',
      name: 'Matematica',
      shortName: 'Mate',
      tagline: 'Numeros, juegos y retos para aprender paso a paso.',
      about:
        'Matematica ayuda a contar, sumar, restar y resolver problemas sencillos de la vida diaria.',
      color: '#14b8a6',
      mascot: '🦊',
      mascotName: 'Lupi la zorrita',
      image: this.buildSubjectImage('🦊', '#14b8a6', '#ccfbf1'),
      bannerTitle: 'Matematica divertida',
      lessonTitle: 'Sumas y restas para resolver retos cotidianos',
      introduction:
        'Las sumas y restas nos ayudan a contar, comparar cantidades y resolver situaciones del dia a dia.',
      explanation:
        'Sumar es juntar cantidades y restar es quitar o encontrar cuantas cosas faltan. Cuando usamos dibujos, juguetes o frutas, entender las operaciones es mas facil y divertido.',
      examples: [
        {
          title: 'Ejemplo 1',
          text: 'Si tienes 3 globos y te regalan 2 mas, ahora tienes 5 globos.'
        },
        {
          title: 'Ejemplo 2',
          text: 'Si en una caja hay 9 colores y usas 4, te quedan 5 colores.'
        }
      ],
      activities: [
        'Cuenta objetos de tu mochila y escribe una suma con ellos.',
        'Resuelve tres restas usando dibujos de frutas o juguetes.',
        'Completa una serie numerica del 1 al 20 sin saltarte ningun numero.'
      ],
      quiz: [
        {
          prompt: 'Si tienes 4 globos y te regalan 3 mas, cuantos globos tienes?',
          options: ['5', '6', '7', '8'],
          correctIndex: 2,
          explanation: '4 + 3 = 7. Cuando juntamos cantidades estamos sumando.'
        },
        {
          prompt: 'Cual es el resultado de 9 - 4?',
          options: ['3', '4', '5', '6'],
          correctIndex: 2,
          explanation: '9 - 4 = 5. Restar es quitar una cantidad.'
        },
        {
          prompt: 'Que operacion sirve para juntar cantidades?',
          options: ['Resta', 'Suma', 'Division', 'Comparacion'],
          correctIndex: 1,
          explanation: 'La suma se usa para reunir cantidades.'
        },
        {
          prompt: 'Si Ana tiene 6 cuadernos y pierde 2, cuantos le quedan?',
          options: ['8', '5', '4', '3'],
          correctIndex: 2,
          explanation: '6 - 2 = 4. A Ana le quedan 4 cuadernos.'
        },
        {
          prompt: 'Cual numero falta en la serie 2, 4, 6, __, 10?',
          options: ['7', '8', '9', '12'],
          correctIndex: 1,
          explanation: 'La serie aumenta de 2 en 2, por eso sigue el 8.'
        }
      ]
    },
    {
      id: 'historia',
      name: 'Historia',
      shortName: 'Historia',
      tagline: 'Descubre el pasado con aventuras, recuerdos y personajes.',
      about:
        'Historia ensena hechos del pasado, personajes importantes y cambios que ocurrieron con el tiempo.',
      color: '#f59e0b',
      mascot: '🦉',
      mascotName: 'Oli la buhita',
      image: this.buildSubjectImage('🦉', '#f59e0b', '#fef3c7'),
      bannerTitle: 'Historia con aventuras',
      lessonTitle: 'Nuestra historia y las personas que dejaron huella',
      introduction:
        'La historia nos cuenta como vivian las personas antes y como cambiaron los lugares con el tiempo.',
      explanation:
        'Con fotos, relatos, museos y lineas del tiempo podemos aprender que ocurrio antes y entender mejor nuestro presente.',
      examples: [
        {
          title: 'Ejemplo 1',
          text: 'Una linea del tiempo muestra hechos ordenados del mas antiguo al mas reciente.'
        },
        {
          title: 'Ejemplo 2',
          text: 'Los museos guardan objetos y recuerdos importantes del pasado.'
        }
      ],
      activities: [
        'Dibuja una linea del tiempo con tres momentos de tu vida.',
        'Pregunta en casa una historia antigua y escribela con tus palabras.',
        'Observa una foto antigua y explica que diferencias ves con la actualidad.'
      ],
      quiz: [
        {
          prompt: 'Para que sirve una linea del tiempo?',
          options: ['Para medir peso', 'Para ordenar hechos', 'Para sumar numeros', 'Para jugar futbol'],
          correctIndex: 1,
          explanation: 'La linea del tiempo organiza hechos del pasado en orden.'
        },
        {
          prompt: 'Que lugar guarda objetos e historias del pasado?',
          options: ['Museo', 'Parque', 'Mercado', 'Hospital'],
          correctIndex: 0,
          explanation: 'En el museo podemos conocer objetos e historias antiguas.'
        },
        {
          prompt: 'La historia ayuda a:',
          options: ['Entender cambios del pasado', 'Olvidar lo ocurrido', 'No leer', 'Resolver sumas'],
          correctIndex: 0,
          explanation: 'La historia explica como cambiaron las personas, lugares y costumbres.'
        },
        {
          prompt: 'Si un hecho ocurrio hace mucho tiempo, pertenece al:',
          options: ['Pasado', 'Futuro', 'Recreo', 'Juego'],
          correctIndex: 0,
          explanation: 'El pasado incluye hechos que ya ocurrieron.'
        },
        {
          prompt: 'Quien puede contarte recuerdos de cuando era pequeno?',
          options: ['Un familiar', 'Una mesa', 'Una regla', 'Un numero'],
          correctIndex: 0,
          explanation: 'Los familiares pueden compartir historias y recuerdos.'
        }
      ]
    },
    {
      id: 'lengua',
      name: 'Lengua y Literatura',
      shortName: 'Lengua',
      tagline: 'Cuentos, lectura y palabras para imaginar y comunicarte.',
      about:
        'Lengua y Literatura ayuda a leer cuentos, comprender textos y expresar ideas con claridad.',
      color: '#8b5cf6',
      mascot: '🐰',
      mascotName: 'Lila la conejita',
      image: this.buildSubjectImage('🐰', '#8b5cf6', '#ede9fe'),
      bannerTitle: 'Cuentos y palabras',
      lessonTitle: 'Cuentos, personajes y mensajes importantes',
      introduction:
        'Los cuentos nos llevan a mundos imaginarios y nos ayudan a comprender, expresar ideas y crear historias propias.',
      explanation:
        'En un cuento hay personajes, lugar, inicio, problema y final. Cuando reconocemos esas partes, entendemos mejor lo que sucede y disfrutamos mas la lectura.',
      examples: [
        {
          title: 'Ejemplo 1',
          text: 'El personaje principal suele vivir el problema mas importante de la historia.'
        },
        {
          title: 'Ejemplo 2',
          text: 'El final nos cuenta como termina la aventura y que aprendieron los personajes.'
        }
      ],
      activities: [
        'Lee un cuento corto y separa inicio, desarrollo y final.',
        'Escribe tres palabras que describan al personaje principal.',
        'Inventa un final feliz para una historia conocida.'
      ],
      quiz: [
        {
          prompt: 'Que parte del cuento presenta el problema principal?',
          options: ['Titulo', 'Nudo', 'Portada', 'Dedicatoria'],
          correctIndex: 1,
          explanation: 'El nudo desarrolla el problema principal del cuento.'
        },
        {
          prompt: 'El desenlace de una historia:',
          options: [
            'Inicia la historia',
            'Explica el titulo',
            'Resuelve o cierra el conflicto',
            'Presenta al autor'
          ],
          correctIndex: 2,
          explanation: 'El desenlace es el cierre de la historia.'
        },
        {
          prompt: 'Comprender un texto significa:',
          options: [
            'Leer sin pensar',
            'Entender sus ideas principales',
            'Copiarlo completo',
            'Saltar parrafos'
          ],
          correctIndex: 1,
          explanation: 'Comprender es entender lo que el texto quiere comunicar.'
        },
        {
          prompt: 'Quien vive los hechos dentro del cuento?',
          options: ['El narrador y los personajes', 'Solo el lector', 'El editor', 'Nadie'],
          correctIndex: 0,
          explanation: 'Los personajes viven la historia y el narrador la cuenta.'
        },
        {
          prompt: 'Un final alternativo es:',
          options: [
            'Otra forma de cerrar la historia',
            'Una portada distinta',
            'Un resumen del cuento',
            'Una regla ortografica'
          ],
          correctIndex: 0,
          explanation: 'Es una nueva propuesta para terminar la historia.'
        }
      ]
    },
    {
      id: 'ciencias',
      name: 'Ciencias Sociales',
      shortName: 'Sociales',
      tagline: 'Aprende sobre tu comunidad, las normas y la convivencia.',
      about:
        'Ciencias Sociales explica como vivimos en comunidad, cuales son las normas y por que debemos convivir con respeto.',
      color: '#ec4899',
      mascot: '🐢',
      mascotName: 'Tito la tortuguita',
      image: this.buildSubjectImage('🐢', '#ec4899', '#fce7f3'),
      bannerTitle: 'Ciencias Sociales',
      lessonTitle: 'La comunidad, las normas y los lugares que compartimos',
      introduction:
        'Vivimos en comunidad con otras personas. Por eso necesitamos normas, respeto y conocer los lugares importantes que nos rodean.',
      explanation:
        'Las ciencias sociales nos ayudan a comprender como viven las personas, que trabajos realizan y por que las reglas mejoran la convivencia en la escuela y el barrio.',
      examples: [
        {
          title: 'Ejemplo 1',
          text: 'La escuela es un lugar de la comunidad donde aprendemos y convivimos.'
        },
        {
          title: 'Ejemplo 2',
          text: 'Las normas del aula ayudan a compartir, escuchar y respetar turnos.'
        }
      ],
      activities: [
        'Dibuja tu comunidad y marca lugares como escuela, parque y hospital.',
        'Escribe dos normas que ayudan a convivir mejor en el aula.',
        'Relaciona profesiones con su aporte a la comunidad.'
      ],
      quiz: [
        {
          prompt: 'Que lugar de la comunidad se relaciona con aprender?',
          options: ['Hospital', 'Escuela', 'Mercado', 'Parqueadero'],
          correctIndex: 1,
          explanation: 'La escuela es el lugar donde aprendemos.'
        },
        {
          prompt: 'Para que sirven las normas?',
          options: [
            'Para convivir mejor',
            'Para correr sin orden',
            'Para olvidar responsabilidades',
            'Para jugar sin respeto'
          ],
          correctIndex: 0,
          explanation: 'Las normas ayudan a convivir con respeto y orden.'
        },
        {
          prompt: 'Quien cuida la salud de las personas en la comunidad?',
          options: ['Medico', 'Panadero', 'Pintor', 'Piloto'],
          correctIndex: 0,
          explanation: 'El medico ayuda a cuidar la salud de las personas.'
        },
        {
          prompt: 'Una buena convivencia significa:',
          options: [
            'Gritar siempre',
            'Respetar a los demas',
            'No escuchar a nadie',
            'Romper reglas'
          ],
          correctIndex: 1,
          explanation: 'Respetar y escuchar mejora la convivencia.'
        },
        {
          prompt: 'Cual es una norma positiva del aula?',
          options: [
            'Empujar a los companeros',
            'Escuchar cuando otro habla',
            'Tirar papeles al piso',
            'No compartir materiales'
          ],
          correctIndex: 1,
          explanation: 'Escuchar cuando otro habla demuestra respeto.'
        }
      ]
    }
  ];

  protected readonly authMode = signal<'login' | 'register'>('login');
  protected readonly authMessage = signal('');
  protected readonly infoMessage = signal('');
  protected readonly videoMessage = signal('');
  protected readonly quizEditorMessage = signal('');
  protected readonly currentUser = signal<StoredUser | null>(null);
  protected readonly selectedSubjectId = signal<SubjectId>('matematica');
  protected readonly quizState = signal<QuizSession | null>(null);
  protected readonly videosBySubject = signal<Record<SubjectId, SubjectVideo[]>>({
    matematica: [],
    historia: [],
    lengua: [],
    ciencias: []
  });
  protected readonly studentsProgress = signal<StudentProgressRecord[]>([]);
  protected readonly loadingSession = signal(true);
  protected readonly submittingAuth = signal(false);
  protected readonly savingQuiz = signal(false);

  protected readonly authForm = {
    name: '',
    email: '',
    password: '',
    role: 'estudiante' as UserRole
  };
  protected readonly studentSearch = signal('');
  protected readonly studentSubjectFilter = signal<'todas' | SubjectId>('todas');
  protected readonly quizEditor = signal<QuizQuestion[]>([]);

  protected readonly selectedSubject = computed(
    () => {
      this.subjectsVersion();
      return this.subjects.find((subject) => subject.id === this.selectedSubjectId()) ?? this.subjects[0];
    }
  );

  protected readonly currentQuestion = computed(() => {
    const quiz = this.quizState();
    if (!quiz || quiz.finished) {
      return null;
    }

    return this.selectedSubject().quiz[quiz.currentQuestionIndex] ?? null;
  });

  protected readonly dashboardCards = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return [];
    }

    return this.subjects.map((subject) => {
      const progress = user.progress[subject.id];
      return {
        id: subject.id,
        name: subject.name,
        mascot: subject.mascot,
        lessonCompleted: progress.lessonCompleted,
        activitiesDone: progress.completedActivities.length,
        totalActivities: subject.activities.length,
        bestScore: progress.bestScore,
        stars: progress.stars,
        feedback: progress.feedback
      };
    });
  });

  protected readonly canManageVideos = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'docente' || role === 'gerente';
  });

  protected readonly canEditEvaluations = computed(() => this.canManageVideos());

  protected readonly activeSubjectVideos = computed(() => {
    const subjectVideos = this.videosBySubject()[this.selectedSubject().id] ?? [];
    return [...subjectVideos].sort(
      (first, second) => new Date(first.uploadedAt).getTime() - new Date(second.uploadedAt).getTime()
    );
  });

  protected readonly currentRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    return this.roles.find((item) => item.value === role)?.label ?? '';
  });

  protected readonly canReviewStudents = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'docente' || role === 'gerente';
  });

  protected readonly studentOverviewCards = computed(() =>
    this.studentsProgress().map((student) => {
      const completedModules = this.subjects.filter(
        (subject) => student.progress[subject.id].lessonCompleted
      ).length;
      const bestScore = Math.max(...this.subjects.map((subject) => student.progress[subject.id].bestScore));
      const averageStars =
        this.subjects.reduce((total, subject) => total + student.progress[subject.id].stars, 0) /
        this.subjects.length;

      return {
        name: student.name,
        email: student.email,
        completedModules,
        totalModules: this.subjects.length,
        bestScore,
        averageStars: Math.round(averageStars),
        watchedVideos: student.completedVideoIds.length,
        subjects: this.subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          lessonCompleted: student.progress[subject.id].lessonCompleted,
          bestScore: student.progress[subject.id].bestScore,
          stars: student.progress[subject.id].stars,
          feedback: student.progress[subject.id].feedback
        }))
      };
    })
  );

  protected readonly filteredStudentOverviewCards = computed(() => {
    const search = this.studentSearch().trim().toLowerCase();
    const subjectFilter = this.studentSubjectFilter();

    return this.studentOverviewCards().filter((student) => {
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search);

      if (!matchesSearch) {
        return false;
      }

      if (subjectFilter === 'todas') {
        return true;
      }

      return student.subjects.some(
        (subject) =>
          subject.id === subjectFilter &&
          (subject.lessonCompleted || subject.bestScore > 0 || subject.stars > 0)
      );
    });
  });

  protected readonly totalQuestions = computed(() => this.selectedSubject().quiz.length);

  private quizTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.restoreSession();
    this.resetQuizEditor();
  }

  ngOnDestroy(): void {
    this.clearQuizTimer();
  }

  protected selectSubject(subjectId: SubjectId): void {
    this.selectedSubjectId.set(subjectId);
    this.resetQuizView();
    this.resetQuizEditor();
    this.infoMessage.set('');
    this.videoMessage.set('');
    this.quizEditorMessage.set('');
  }

  protected async submitAuth(): Promise<void> {
    const payload = {
      name: this.authForm.name.trim(),
      email: this.authForm.email.trim().toLowerCase(),
      password: this.authForm.password.trim(),
      role: this.authForm.role
    };

    if (!payload.email || !payload.password) {
      this.authMessage.set('Ups, te equivocaste: debes escribir correo y contrasena.');
      return;
    }

    if (this.authMode() === 'register' && !payload.name) {
      this.authMessage.set('Ups, te equivocaste: falta el nombre del usuario.');
      return;
    }

    this.submittingAuth.set(true);
    this.authMessage.set('');

    try {
      const endpoint = this.authMode() === 'login' ? apiUrl('/api/auth/login') : apiUrl('/api/auth/register');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse<{
        user?: StoredUser;
      }>;
      const user = result.data?.user;

      if (!response.ok || !user) {
        this.authMessage.set(result.message ?? 'Ups, te equivocaste: no se pudo procesar el acceso.');
        return;
      }

      this.setCurrentUser(user);
      this.authForm.name = '';
      this.authForm.email = '';
      this.authForm.password = '';
      this.authForm.role = 'estudiante';
      this.authMessage.set(
        this.authMode() === 'login'
          ? `Bienvenido, ${user.name}. Ya entraste a la plataforma.`
          : `Cuenta creada con exito. Bienvenido, ${user.name}.`
      );

      await this.loadStoredVideos();
      await this.loadStudentsProgress();
      await this.loadStoredQuizzes();
    } catch {
      this.authMessage.set('Ups, te equivocaste: no se pudo conectar con la base de datos del proyecto.');
    } finally {
      this.submittingAuth.set(false);
    }
  }

  protected logout(): void {
    this.currentUser.set(null);
    this.clearSession();
    this.resetQuizView();
    this.authMode.set('login');
    this.infoMessage.set('');
    this.videoMessage.set('');
    this.studentsProgress.set([]);
    this.quizEditorMessage.set('');
  }

  protected markLessonComplete(): void {
    const subjectId = this.selectedSubject().id;
    void this.updateUserProgress(subjectId, (progress) => ({
      ...progress,
      lessonCompleted: true
    }));
    this.infoMessage.set('La leccion fue marcada como revisada.');
  }

  protected toggleActivity(activityIndex: number): void {
    const subjectId = this.selectedSubject().id;
    void this.updateUserProgress(subjectId, (progress) => {
      const completed = progress.completedActivities.includes(activityIndex)
        ? progress.completedActivities.filter((index) => index !== activityIndex)
        : [...progress.completedActivities, activityIndex].sort((a, b) => a - b);

      return {
        ...progress,
        completedActivities: completed
      };
    });
  }

  protected isActivityCompleted(activityIndex: number): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    return user.progress[this.selectedSubject().id].completedActivities.includes(activityIndex);
  }

  protected startQuiz(): void {
    const subject = this.selectedSubject();
    this.quizState.set({
      subjectId: subject.id,
      currentQuestionIndex: 0,
      answers: Array(subject.quiz.length).fill(-1),
      score: 0,
      secondsLeft: QUIZ_DURATION_SECONDS,
      finished: false,
      lastExplanation: '',
      lastAnswerCorrect: null
    });

    this.beginQuizTimer();
  }

  protected answerQuestion(optionIndex: number): void {
    const quiz = this.quizState();
    const question = this.currentQuestion();
    const subject = this.selectedSubject();

    if (!quiz || !question || quiz.finished || quiz.answers[quiz.currentQuestionIndex] !== -1) {
      return;
    }

    const answers = [...quiz.answers];
    answers[quiz.currentQuestionIndex] = optionIndex;
    const correct = optionIndex === question.correctIndex;
    const correctAnswers = answers.reduce((total, answer, index) => {
      if (answer === -1) {
        return total;
      }

      return total + (answer === subject.quiz[index]?.correctIndex ? 1 : 0);
    }, 0);
    const updatedScore = Math.round((correctAnswers / subject.quiz.length) * 100);

    this.quizState.set({
      ...quiz,
      answers,
      score: updatedScore,
      lastExplanation: correct
        ? `Muy bien. ${question.explanation}`
        : `Ups, te equivocaste. ${question.explanation}`,
      lastAnswerCorrect: correct
    });
  }

  protected goToNextQuestion(): void {
    const quiz = this.quizState();
    const subject = this.selectedSubject();

    if (!quiz || quiz.finished) {
      return;
    }

    if (quiz.currentQuestionIndex >= subject.quiz.length - 1) {
      this.finishQuiz('completed');
      return;
    }

    this.quizState.set({
      ...quiz,
      currentQuestionIndex: quiz.currentQuestionIndex + 1,
      lastExplanation: '',
      lastAnswerCorrect: null
    });
  }

  protected finishQuiz(reason: 'completed' | 'time'): void {
    const quiz = this.quizState();
    if (!quiz || quiz.finished) {
      return;
    }

    const finalScore = quiz.score;
    const feedback = this.generateFeedback(finalScore, reason);

    this.quizState.set({
      ...quiz,
      finished: true,
      secondsLeft: reason === 'time' ? 0 : quiz.secondsLeft,
      lastExplanation: feedback,
      lastAnswerCorrect: null
    });

    this.clearQuizTimer();
    void this.updateUserProgress(quiz.subjectId, (progress) => ({
      ...progress,
      latestScore: finalScore,
      bestScore: Math.max(progress.bestScore, finalScore),
      stars: Math.max(progress.stars, this.calculateStars(finalScore)),
      feedback,
      quizzesTaken: progress.quizzesTaken + 1
    }));
  }

  protected resetQuizView(): void {
    this.clearQuizTimer();
    this.quizState.set(null);
  }

  protected progressForSelectedSubject(): SubjectProgress | null {
    const user = this.currentUser();
    if (!user) {
      return null;
    }

    return user.progress[this.selectedSubject().id];
  }

  protected overallCompletion(): number {
    const user = this.currentUser();
    if (!user) {
      return 0;
    }

    const totalItems = this.subjects.length * 2;
    const completedItems = this.subjects.reduce((total, subject) => {
      const progress = user.progress[subject.id];
      const lessonDone = progress.lessonCompleted ? 1 : 0;
      const quizDone = progress.bestScore > 0 ? 1 : 0;
      return total + lessonDone + quizDone;
    }, 0);

    return Math.round((completedItems / totalItems) * 100);
  }

  protected starsArray(stars: number): number[] {
    return Array.from({ length: stars }, (_, index) => index);
  }

  protected emptyStarsArray(stars: number): number[] {
    return Array.from({ length: Math.max(0, 5 - stars) }, (_, index) => index);
  }

  protected formatTime(secondsLeft: number): string {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(secondsLeft % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  protected isVideoCompleted(videoId: string): boolean {
    return this.currentUser()?.completedVideoIds.includes(videoId) ?? false;
  }

  protected isVideoLocked(videoIndex: number): boolean {
    if (videoIndex === 0) {
      return false;
    }

    const previousVideo = this.activeSubjectVideos()[videoIndex - 1];
    if (!previousVideo) {
      return false;
    }

    return !this.isVideoCompleted(previousVideo.id);
  }

  protected async handleVideoEnded(videoId: string): Promise<void> {
    const user = this.currentUser();
    if (!user || this.isVideoCompleted(videoId)) {
      return;
    }

    try {
      const response = await fetch(
        apiUrl(`/api/users/${encodeURIComponent(user.email)}/videos/${encodeURIComponent(videoId)}/complete`),
        {
          method: 'POST'
        }
      );

      const result = (await response.json().catch(() => ({}))) as ApiResponse<{ user?: StoredUser }>;
      const updatedUser = result.data?.user;
      if (response.ok && updatedUser) {
        this.setCurrentUser(updatedUser);
        this.videoMessage.set('Muy bien. Terminaste este video y se desbloqueo el siguiente.');
      }
    } catch {
      this.videoMessage.set('No se pudo guardar el avance del video.');
    }
  }

  protected async handleVideoUpload(event: Event): Promise<void> {
    if (!this.canManageVideos()) {
      this.videoMessage.set('Solo docentes o gerentes pueden subir videos.');
      return;
    }

    const input = event.target as HTMLInputElement;
    input.value = '';
    this.videoMessage.set('Los videos se cargan desde la carpeta app-storage/uploaded-videos y el archivo app-storage/videos.json.');
  }

  protected async removeVideo(_videoId: string): Promise<void> {
    if (!this.canManageVideos()) {
      return;
    }

    this.videoMessage.set('Para quitar un video, elimina el archivo de app-storage/uploaded-videos y actualiza app-storage/videos.json.');
  }

  protected updateQuizEditorQuestion(
    questionIndex: number,
    field: 'prompt' | 'explanation',
    value: string
  ): void {
    const nextQuiz = this.quizEditor().map((question, index) =>
      index === questionIndex ? { ...question, [field]: value } : question
    );
    this.quizEditor.set(nextQuiz);
  }

  protected updateQuizEditorOption(questionIndex: number, optionIndex: number, value: string): void {
    const nextQuiz = this.quizEditor().map((question, index) =>
      index === questionIndex
        ? {
            ...question,
            options: question.options.map((option, currentIndex) =>
              currentIndex === optionIndex ? value : option
            )
          }
        : question
    );
    this.quizEditor.set(nextQuiz);
  }

  protected updateQuizCorrectOption(questionIndex: number, value: string): void {
    const nextCorrectIndex = Number(value);
    const nextQuiz = this.quizEditor().map((question, index) =>
      index === questionIndex ? { ...question, correctIndex: nextCorrectIndex } : question
    );
    this.quizEditor.set(nextQuiz);
  }

  protected async saveQuizEditor(): Promise<void> {
    if (!this.canEditEvaluations()) {
      return;
    }

    const quiz = this.quizEditor().map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim()
    }));

    const hasInvalidQuestion = quiz.some(
      (question) =>
        !question.prompt ||
        !question.explanation ||
        question.options.length !== 4 ||
        question.options.some((option) => !option)
    );

    if (hasInvalidQuestion) {
      this.quizEditorMessage.set(
        'Ups, te equivocaste: cada pregunta necesita enunciado, 4 opciones y explicacion.'
      );
      return;
    }

    if (quiz.length < 5) {
      this.quizEditorMessage.set('Ups, te equivocaste: la evaluacion debe tener al menos 5 preguntas.');
      return;
    }

    this.savingQuiz.set(true);
    this.quizEditorMessage.set('');

    try {
      const response = await fetch(apiUrl(`/api/quizzes/${this.selectedSubject().id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quiz })
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse<{
        quiz?: QuizQuestion[];
      }>;
      const savedQuiz = result.data?.quiz;

      if (!response.ok || !savedQuiz) {
        this.quizEditorMessage.set(result.message ?? 'No se pudo guardar la evaluacion.');
        return;
      }

      this.replaceSubjectQuiz(this.selectedSubject().id, savedQuiz);
      this.quizEditor.set(savedQuiz.map((question) => ({ ...question, options: [...question.options] })));
      this.resetQuizView();
      this.quizEditorMessage.set('La evaluacion fue actualizada correctamente.');
    } catch {
      this.quizEditorMessage.set('No se pudo guardar la evaluacion en la base de datos.');
    } finally {
      this.savingQuiz.set(false);
    }
  }

  protected progressTone(completedModules: number, totalModules: number): 'high' | 'medium' | 'low' {
    const percentage = totalModules === 0 ? 0 : (completedModules / totalModules) * 100;
    if (percentage >= 75) {
      return 'high';
    }
    if (percentage >= 40) {
      return 'medium';
    }
    return 'low';
  }

  protected addQuizQuestion(): void {
    this.quizEditor.update((quiz) => [
      ...quiz,
      {
        prompt: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ]);
  }

  protected removeQuizQuestion(questionIndex: number): void {
    if (this.quizEditor().length <= 5) {
      this.quizEditorMessage.set('Ups, te equivocaste: debes dejar al menos 5 preguntas en la evaluacion.');
      return;
    }

    this.quizEditor.set(this.quizEditor().filter((_, index) => index !== questionIndex));
  }

  private async restoreSession(): Promise<void> {
    if (typeof window === 'undefined') {
      this.loadingSession.set(false);
      return;
    }

    const savedEmail = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!savedEmail) {
      this.loadingSession.set(false);
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/users/${encodeURIComponent(savedEmail)}`));
      const result = (await response.json().catch(() => ({}))) as ApiResponse<{ user?: StoredUser }>;
      const user = result.data?.user;

      if (!response.ok || !user) {
        this.clearSession();
      } else {
        this.currentUser.set(user);
        await this.loadStoredVideos();
        await this.loadStudentsProgress();
        await this.loadStoredQuizzes();
      }
    } catch {
      this.authMessage.set('Ups, te equivocaste: no se pudo recuperar tu sesion guardada.');
    } finally {
      this.loadingSession.set(false);
    }
  }

  private setCurrentUser(user: StoredUser): void {
    this.currentUser.set(user);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, user.email);
    }
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private async updateUserProgress(
    subjectId: SubjectId,
    updater: (progress: SubjectProgress) => SubjectProgress
  ): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.authMessage.set('Ups, te equivocaste: primero debes iniciar sesion.');
      return;
    }

    const nextProgress = updater(user.progress[subjectId]);

    try {
      const response = await fetch(apiUrl(`/api/users/${encodeURIComponent(user.email)}/progress`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId,
          progress: nextProgress
        })
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse<{
        user?: StoredUser;
      }>;
      const updatedUser = result.data?.user;

      if (!response.ok || !updatedUser) {
        this.infoMessage.set(result.message ?? 'No se pudo guardar el progreso.');
        return;
      }

      this.setCurrentUser(updatedUser);
    } catch {
      this.infoMessage.set('No se pudo guardar el progreso en la base de datos.');
    }
  }

  private async loadStoredVideos(): Promise<void> {
    try {
      const response = await fetch('/app-storage/videos.json');
      const records = ((await response.json().catch(() => [])) as LocalSubjectVideo[]).map((record) => ({
        ...record,
        url: `/app-storage/uploaded-videos/${record.fileName}`
      }));
      const nextVideos: Record<SubjectId, SubjectVideo[]> = {
        matematica: [],
        historia: [],
        lengua: [],
        ciencias: []
      };

      for (const record of records) {
        nextVideos[record.subjectId].push(record);
      }

      this.videosBySubject.set(nextVideos);
    } catch {
      this.videoMessage.set('No se pudieron cargar los videos guardados.');
    }
  }

  private async loadStoredQuizzes(): Promise<void> {
    try {
      const response = await fetch(apiUrl('/api/quizzes'));
      const result = (await response.json().catch(() => ({}))) as ApiResponse<{
        quizzes?: Record<SubjectId, QuizQuestion[]>;
      }>;
      const quizzes = result.data?.quizzes;

      if (!response.ok || !quizzes) {
        return;
      }

      (Object.keys(quizzes) as SubjectId[]).forEach((subjectId) => {
        this.replaceSubjectQuiz(subjectId, quizzes[subjectId]);
      });
      this.resetQuizEditor();
    } catch {
      this.quizEditorMessage.set('No se pudieron cargar las evaluaciones guardadas.');
    }
  }

  private replaceSubjectQuiz(subjectId: SubjectId, quiz: QuizQuestion[]): void {
    const subject = this.subjects.find((item) => item.id === subjectId);
    if (!subject) {
      return;
    }

    subject.quiz = quiz.map((question) => ({
      prompt: question.prompt,
      options: [...question.options],
      correctIndex: question.correctIndex,
      explanation: question.explanation
    }));
    this.subjectsVersion.update((value) => value + 1);
  }

  private resetQuizEditor(): void {
    this.quizEditor.set(
      this.selectedSubject().quiz.map((question) => ({
        prompt: question.prompt,
        options: [...question.options],
        correctIndex: question.correctIndex,
        explanation: question.explanation
      }))
    );
  }

  private async loadStudentsProgress(): Promise<void> {
    if (!this.canReviewStudents()) {
      this.studentsProgress.set([]);
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/students'));
      const result = (await response.json().catch(() => ({}))) as ApiResponse<{
        students?: StudentProgressRecord[];
      }>;
      const students = result.data?.students;

      if (!response.ok || !students) {
        this.studentsProgress.set([]);
        return;
      }

      this.studentsProgress.set(students);
    } catch {
      this.studentsProgress.set([]);
    }
  }

  private beginQuizTimer(): void {
    this.clearQuizTimer();
    this.quizTimer = setInterval(() => {
      this.zone.run(() => {
        const quiz = this.quizState();
        if (!quiz || quiz.finished) {
          this.clearQuizTimer();
          return;
        }

        if (quiz.secondsLeft <= 1) {
          this.finishQuiz('time');
          return;
        }

        this.quizState.set({
          ...quiz,
          secondsLeft: quiz.secondsLeft - 1
        });
      });
    }, 1000);
  }

  private clearQuizTimer(): void {
    if (this.quizTimer) {
      clearInterval(this.quizTimer);
      this.quizTimer = null;
    }
  }

  private calculateStars(score: number): number {
    if (score >= 90) {
      return 5;
    }
    if (score >= 75) {
      return 4;
    }
    if (score >= 60) {
      return 3;
    }
    if (score >= 40) {
      return 2;
    }
    return 1;
  }

  private generateFeedback(score: number, reason: 'completed' | 'time'): string {
    if (reason === 'time') {
      return 'Ups, te equivocaste con el tiempo: se acabaron los 5 minutos antes de terminar.';
    }
    if (score >= 90) {
      return 'Excelente. Respondiste muy bien y ganaste muchas estrellas.';
    }
    if (score >= 75) {
      return 'Muy bien. Vas por un gran camino y solo necesitas un pequeno repaso.';
    }
    if (score >= 60) {
      return 'Buen trabajo. Practica un poco mas para subir tu puntaje.';
    }
    return 'Ups, te equivocaste en varias respuestas. Revisa la leccion y vuelve a intentarlo.';
  }

  private buildSubjectImage(mascot: string, mainColor: string, softColor: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
        <rect width="1200" height="720" rx="54" fill="${softColor}" />
        <circle cx="210" cy="160" r="120" fill="${mainColor}" opacity="0.18" />
        <circle cx="980" cy="560" r="150" fill="${mainColor}" opacity="0.14" />
        <rect x="90" y="94" width="1020" height="532" rx="42" fill="white" opacity="0.72" />
        <text x="600" y="330" text-anchor="middle" font-size="220">${mascot}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
