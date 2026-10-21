const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(process.env.DATABASE_PATH || './database.sqlite');

// ---- создание таблиц ----
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    language TEXT DEFAULT 'Python',
    current_lesson INTEGER DEFAULT 1,
    total_lessons INTEGER DEFAULT 6,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    avatar TEXT,
    rank INTEGER DEFAULT 10,
    daily_goal INTEGER DEFAULT 50,
    daily_minutes INTEGER DEFAULT 0,
    daily_xp INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language TEXT NOT NULL,
    lesson_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    status TEXT DEFAULT 'locked',
    content TEXT,
    xp_reward INTEGER DEFAULT 50,
    UNIQUE(language, lesson_number)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  )`);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_progress_user_lesson
    ON user_progress(user_id, lesson_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    task_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    question TEXT NOT NULL,
    code TEXT,
    options TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_mistakes (
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, task_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`);
});

const AVATAR_DIR = path.join(__dirname, 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// Раздаём статикой: GET /uploads/avatars/xxx.png
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('Только изображения'), ok);
  },
});

// ---------- SEED: задачи ----------
function seedTasks() {
  db.get(`SELECT COUNT(*) AS count FROM tasks`, (err, row) => {
    if (err) return console.error('Ошибка чтения tasks:', err);
    if (row && row.count > 0) {
      console.log('ℹ️ Tasks уже засеяны, пропускаем');
      return;
    }

    const tasks = [
      // ===== Lesson 1: Hello World =====
      { lesson_number: 1, task_number: 1, type: 'multiple_choice',
        question: 'Which function is used to print text in Python?',
        options: JSON.stringify(['print()', 'echo()', 'log()', 'write()']),
        correct_answer: 'print()',
        explanation: 'The print() function outputs text to the console.' },
      { lesson_number: 1, task_number: 2, type: 'multiple_choice',
        question: 'What does this code do?\n\nprint("Hello, World!")',
        options: JSON.stringify(['Prints Hello, World!', 'Creates a variable', 'Nothing', 'Throws an error']),
        correct_answer: 'Prints Hello, World!',
        explanation: 'print() displays the string "Hello, World!" in the console.' },
      { lesson_number: 1, task_number: 3, type: 'multiple_choice',
        question: 'What is the correct way to print "Hi"?',
        options: JSON.stringify(['print("Hi")', 'print(Hi)', 'print "Hi"', 'print: Hi']),
        correct_answer: 'print("Hi")',
        explanation: 'Strings must be wrapped in quotes inside print().' },

      // ===== Lesson 2: Variables =====
      { lesson_number: 2, task_number: 1, type: 'multiple_choice',
        question: 'How do you create a variable x with value 5 in Python?',
        options: JSON.stringify(['x = 5', 'var x = 5', 'let x = 5', 'int x = 5']),
        correct_answer: 'x = 5',
        explanation: 'Python creates variables with simple assignment: x = 5.' },
      { lesson_number: 2, task_number: 2, type: 'multiple_choice',
        question: 'What will this code print?\n\nname = "Anna"\nprint(name)',
        options: JSON.stringify(['Anna', 'name', 'Nothing', 'Error']),
        correct_answer: 'Anna',
        explanation: 'print(name) outputs the value stored in the variable name.' },
      { lesson_number: 2, task_number: 3, type: 'multiple_choice',
        question: 'Which is a valid variable name in Python?',
        options: JSON.stringify(['my_var', '2var', 'my-var', 'my var']),
        correct_answer: 'my_var',
        explanation: 'Variable names can contain letters, digits and underscores, but cannot start with a digit.' },

      // ===== Lesson 3: Conditions =====
      { lesson_number: 3, task_number: 1, type: 'multiple_choice',
        question: 'Which keyword is used to check a condition in Python?',
        options: JSON.stringify(['if', 'when', 'check', 'loop']),
        correct_answer: 'if',
        explanation: 'The "if" keyword is used to check conditions in Python.' },
      { lesson_number: 3, task_number: 2, type: 'multiple_choice',
        question: 'What will this code print?\n\nif age > 18:\n    print("Adult")\n\nage = 20',
        options: JSON.stringify(['Adult', 'Child', 'Nothing', 'Error']),
        correct_answer: 'Adult',
        explanation: 'Since 20 > 18, the condition is True and "Adult" is printed.' },
      { lesson_number: 3, task_number: 3, type: 'multiple_choice',
        question: 'Which is the correct Python syntax for an if statement?',
        options: JSON.stringify(['if x > 5:', 'if (x > 5)', 'if x > 5 then:', 'when x > 5:']),
        correct_answer: 'if x > 5:',
        explanation: 'Python uses "if condition:" with a colon at the end.' },
      { lesson_number: 3, task_number: 4, type: 'multiple_choice',
        question: 'What does this code output?\n\nx = 10\nif x > 5:\n    print("Big")\nelse:\n    print("Small")',
        options: JSON.stringify(['Big', 'Small', '10', 'Error']),
        correct_answer: 'Big',
        explanation: 'x is 10, which is greater than 5, so "Big" is printed.' },
      { lesson_number: 3, task_number: 5, type: 'multiple_choice',
        question: 'Which operator checks if two values are equal in Python?',
        options: JSON.stringify(['==', '=', '!=', '===']),
        correct_answer: '==',
        explanation: '"==" checks equality, "=" is for assignment.' },
    ];

    const stmt = db.prepare(
      `INSERT INTO tasks
         (lesson_id, task_number, type, question, options, correct_answer, explanation)
       VALUES (
         (SELECT id FROM lessons WHERE lesson_number = ? AND language = 'Python'),
         ?, ?, ?, ?, ?, ?
       )`
    );

    tasks.forEach(t => {
      stmt.run(
        t.lesson_number, t.task_number, t.type,
        t.question, t.options, t.correct_answer, t.explanation,
        runErr => { if (runErr) console.error('Ошибка вставки задания:', runErr); }
      );
    });

    stmt.finalize(err => {
      if (err) return console.error('Ошибка финализации tasks:', err);
      console.log(`✅ Задания добавлены в БД: ${tasks.length}`);
    });
  });
}

// ---------- SEED: уроки ----------
db.get(`SELECT COUNT(*) AS count FROM lessons`, (err, row) => {
  if (err) return console.error('Ошибка чтения lessons:', err);

  if (row && row.count > 0) {
    // Уроки уже есть — всё равно проверяем задачи (важно для случая,
    // когда БД была засеяна старым сломанным сидером)
    console.log('ℹ️ Уроки уже засеяны, проверяем задачи...');
    return seedTasks();
  }

  const lessons = [
    ['Python', 1, 'Hello World', 'Your first lines of code', 'active',    10],
    ['Python', 2, 'Variables',   'Give your data a name',    'locked',    30],
    ['Python', 3, 'Conditions',  'Make decisions in code',   'locked',    50],
    ['Python', 4, 'Loops',       'Repeat the good stuff',    'locked',    50],
    ['Python', 5, 'Functions',   'Build reusable blocks',    'locked',    50],
    ['Python', 6, 'Arrays',      'Keep it all together',     'locked',    50],
  ];

  const lessonStmt = db.prepare(
    `INSERT INTO lessons (language, lesson_number, title, subtitle, status, xp_reward)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  lessons.forEach(l => lessonStmt.run(...l));

  lessonStmt.finalize(finalizeErr => {
    if (finalizeErr) return console.error('Ошибка вставки уроков:', finalizeErr);
    console.log('✅ Уроки добавлены в БД');
    seedTasks();
  });
});

const TYPESCRIPT_LESSONS = [
  [1, 'Hello TypeScript', 'Write your first typed command', 10],
  [2, 'Variables and types', 'Give values clear types', 30],
  [3, 'Basic types', 'Use strings, numbers and booleans', 50],
  [4, 'Conditions', 'Choose actions with conditions', 50],
  [5, 'Loops', 'Repeat actions with a loop', 50],
  [6, 'Functions', 'Write functions with typed inputs', 50],
];

const TYPESCRIPT_TASKS = [
  { lesson: 1, number: 1, code: `console.log('Hello, TypeScript!');`, question: 'Which command writes text to the console?', options: ['console.log()', 'print()', 'echo()', 'write()'], answer: 'console.log()', explanation: 'console.log() writes a value to the console.' },
  { lesson: 1, number: 2, code: `console.log(2 + 3);`, question: 'What value does this code write to the console?', options: ['5', '23', '2 + 3', 'Nothing'], answer: '5', explanation: 'The plus operator adds the two numbers.' },
  { lesson: 2, number: 1, code: `const score: number = 10;`, question: 'What does the type annotation number show?', options: ['score stores a number', 'score is a function', 'score stores text', 'score cannot have a value'], answer: 'score stores a number', explanation: 'The annotation after the colon states the variable type.' },
  { lesson: 2, number: 2, code: `const userName: string = 'Ada';`, question: 'Which type matches the value Ada?', options: ['string', 'number', 'boolean', 'void'], answer: 'string', explanation: 'Text values use the string type.' },
  { lesson: 3, number: 1, code: `let isReady: boolean = true;`, question: 'Which values can a boolean store?', options: ['true or false', 'text only', 'whole numbers only', 'arrays only'], answer: 'true or false', explanation: 'A boolean value is true or false.' },
  { lesson: 3, number: 2, code: `let count: number = 4;`, question: 'Which type is used for count?', options: ['number', 'string', 'boolean', 'object'], answer: 'number', explanation: 'The annotation defines count as a number.' },
  { lesson: 4, number: 1, code: `const age: number = 20;\nif (age >= 18) {\n  console.log('Adult');\n}`, question: 'What does the condition check?', options: ['Whether age is at least 18', 'Whether age is text', 'Whether age is less than 18', 'Whether age is undefined'], answer: 'Whether age is at least 18', explanation: 'The >= operator checks if the left value is greater than or equal to the right value.' },
  { lesson: 4, number: 2, code: `const isOpen: boolean = false;\nif (!isOpen) {\n  console.log('Closed');\n}`, question: 'What does the ! operator do here?', options: ['It changes false to true', 'It adds two values', 'It declares a type', 'It repeats the code'], answer: 'It changes false to true', explanation: 'The ! operator means NOT.' },
  { lesson: 5, number: 1, code: `for (let i: number = 0; i < 3; i++) {\n  console.log(i);\n}`, question: 'Which values does this loop write?', options: ['0, 1, 2', '1, 2, 3', '0, 1, 2, 3', '3 only'], answer: '0, 1, 2', explanation: 'The loop stops when i is no longer less than 3.' },
  { lesson: 5, number: 2, code: `for (let i: number = 0; i < 2; i++) {\n  console.log('Hi');\n}`, question: 'How many times does this loop write Hi?', options: ['2', '1', '3', '0'], answer: '2', explanation: 'The values of i are 0 and 1, so the loop runs twice.' },
  { lesson: 6, number: 1, code: `function greet(name: string): string {\n  return 'Hello, ' + name;\n}`, question: 'What does the type after the parentheses describe?', options: ['The return value type', 'The name type', 'The function name', 'The number of calls'], answer: 'The return value type', explanation: 'The string after the parentheses says that the function returns text.' },
  { lesson: 6, number: 2, code: `function double(value: number): number {\n  return value * 2;\n}`, question: 'Which type must value use?', options: ['number', 'string', 'boolean', 'void'], answer: 'number', explanation: 'The function declares value as a number.' },
];

function seedTypeScriptCourse(callback) {
  const lessonStatement = db.prepare(
    `INSERT OR IGNORE INTO lessons (language, lesson_number, title, subtitle, status, xp_reward)
     VALUES ('TypeScript', ?, ?, ?, 'locked', ?)`
  );
  let firstError = null;
  TYPESCRIPT_LESSONS.forEach((lesson) => {
    lessonStatement.run(...lesson, (error) => { if (error && !firstError) firstError = error; });
  });
  lessonStatement.finalize((lessonFinalizeError) => {
    if (lessonFinalizeError || firstError) return callback(lessonFinalizeError || firstError);
    const taskStatement = db.prepare(
      `INSERT INTO tasks
         (lesson_id, task_number, type, question, code, options, correct_answer, explanation)
       SELECT lessons.id, ?, 'multiple_choice', ?, ?, ?, ?, ?
       FROM lessons
       WHERE lessons.language = 'TypeScript' AND lessons.lesson_number = ?
         AND NOT EXISTS (
           SELECT 1 FROM tasks
           WHERE tasks.lesson_id = lessons.id AND tasks.task_number = ?
         )`
    );
    firstError = null;
    TYPESCRIPT_TASKS.forEach((task) => {
      taskStatement.run(
        task.number,
        task.question,
        task.code,
        JSON.stringify(task.options),
        task.answer,
        task.explanation,
        task.lesson,
        task.number,
        (error) => { if (error && !firstError) firstError = error; }
      );
    });
    taskStatement.finalize((taskFinalizeError) => {
      if (taskFinalizeError || firstError) return callback(taskFinalizeError || firstError);
      db.run(
        `UPDATE users
         SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE lessons.language = 'TypeScript')
         WHERE language = 'TypeScript'`,
        callback
      );
    });
  });
}

const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key';

function bootstrapAdmin(onReady) {
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Unable to check user schema:', err.message);
      return onReady();
    }

    const names = new Set(columns.map((column) => column.name));
    const missingColumns = [
      ['daily_goal', 'INTEGER DEFAULT 50'],
      ['daily_minutes', 'INTEGER DEFAULT 0'],
      ['daily_xp', 'INTEGER DEFAULT 0'],
      ['daily_xp_date', 'TEXT'],
      ['is_admin', 'INTEGER DEFAULT 0'],
      ['must_change_password', 'INTEGER DEFAULT 0'],
    ].filter(([name]) => !names.has(name));

    const addMissingColumn = (index) => {
      if (index < missingColumns.length) {
        const [name, definition] = missingColumns[index];
        return db.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`, (migrationError) => {
          if (migrationError) {
            console.error('Unable to update user schema:', migrationError.message);
            return onReady();
          }
          addMissingColumn(index + 1);
        });
      }

      const ensureAdmin = () => db.get(`SELECT id FROM users WHERE is_admin = 1 LIMIT 1`, async (adminError, admin) => {
        if (adminError || admin) {
          if (adminError) console.error('Unable to check admin account:', adminError.message);
          return onReady();
        }

        const username = process.env.ADMIN_USERNAME || 'admin';
        const email = process.env.ADMIN_EMAIL || 'admin@byte.local';
        const generatedPassword = !process.env.ADMIN_PASSWORD;
        const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('hex');

        try {
          const passwordHash = await bcrypt.hash(password, 12);
          db.run(
            `INSERT INTO users (username, email, password, is_admin, must_change_password)
             VALUES (?, ?, ?, 1, 1)`,
            [username, email, passwordHash],
            function (createError) {
              if (createError) {
                console.error('Unable to create admin account:', createError.message);
              } else {
                console.log(`Initial admin login: ${username} (${email})`);
                if (generatedPassword) console.log(`Initial admin password: ${password}`);
                console.log('Change this password after the first login.');
              }
              onReady();
            }
          );
        } catch (hashError) {
          console.error('Unable to create admin password:', hashError.message);
          onReady();
        }
      });

      db.all(`PRAGMA table_info(tasks)`, (taskSchemaError, taskColumns) => {
        if (taskSchemaError) {
          console.error('Unable to check task schema:', taskSchemaError.message);
          return onReady();
        }
        if (taskColumns.some((column) => column.name === 'code')) return ensureAdmin();
        db.run(`ALTER TABLE tasks ADD COLUMN code TEXT`, (migrationError) => {
          if (migrationError) {
            console.error('Unable to update task schema:', migrationError.message);
            return onReady();
          }
          ensureAdmin();
        });
      });
    };

    addMissingColumn(0);
  });
}

function requireAdmin(req, res, next) {
  const match = (req.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Требуется войти в аккаунт' });

  jwt.verify(match[1], SECRET_KEY, (tokenError, payload) => {
    if (tokenError) return res.status(401).json({ error: 'Сеанс недействителен' });
    db.get(
      `SELECT id, is_admin, must_change_password FROM users WHERE id = ?`,
      [payload.id],
      (dbError, user) => {
        if (dbError) return res.status(500).json({ error: 'Не удалось проверить доступ администратора' });
        if (!user?.is_admin) return res.status(403).json({ error: 'Требуется доступ администратора' });
        req.adminUser = user;
        next();
      }
    );
  });
}

function requireChangedAdminPassword(req, res, next) {
  if (req.adminUser.must_change_password) {
    return res.status(428).json({ error: 'Перед использованием этой страницы измените пароль администратора' });
  }
  next();
}

// ---------- API ----------
app.get('/api/user/:id/practice', (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Неверный идентификатор пользователя' });
  }

  db.all(
    `SELECT tasks.id AS taskId, lessons.lesson_number AS lessonNumber,
       lessons.title AS lessonTitle, tasks.question
     FROM user_mistakes
     JOIN tasks ON tasks.id = user_mistakes.task_id
     JOIN lessons ON lessons.id = tasks.lesson_id
     WHERE user_mistakes.user_id = ?
     ORDER BY user_mistakes.created_at DESC, tasks.id`,
    [userId],
    (err, mistakes) => {
      if (err) return res.status(500).json({ error: 'Не удалось загрузить вопросы для повторения' });
      res.json({ mistakes });
    }
  );
});

app.get('/api/user/:id/practice/:taskId', (req, res) => {
  const userId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(taskId) || taskId < 1) {
    return res.status(400).json({ error: 'Неверный идентификатор пользователя или задания' });
  }

  db.get(
    `SELECT lessons.id AS lessonId, lessons.lesson_number AS number,
       lessons.title, lessons.subtitle, lessons.xp_reward,
       tasks.id, tasks.type, tasks.question, tasks.code, tasks.options,
       tasks.correct_answer, tasks.explanation
     FROM user_mistakes
     JOIN tasks ON tasks.id = user_mistakes.task_id
     JOIN lessons ON lessons.id = tasks.lesson_id
     WHERE user_mistakes.user_id = ? AND tasks.id = ?`,
    [userId, taskId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Не удалось загрузить вопрос для повторения' });
      if (!row) return res.status(404).json({ error: 'Вопрос для повторения не найден' });
      const {
        lessonId, number, title, subtitle, xp_reward,
        id, type, question, code, options, correct_answer, explanation,
      } = row;
      res.json({
        lesson: { id: lessonId, number, title, subtitle, xp_reward },
        task: { id, type, question, code, options: options ? JSON.parse(options) : [], correct_answer, explanation },
      });
    }
  );
});

app.post('/api/user/:id/task/:taskId/answer', (req, res) => {
  const userId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const { answer } = req.body;
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(taskId) || taskId < 1 ||
      typeof answer !== 'string') {
    return res.status(400).json({ error: 'Неверный идентификатор пользователя, задания или ответа' });
  }

  db.get(`SELECT correct_answer FROM tasks WHERE id = ?`, [taskId], (err, task) => {
    if (err) return res.status(500).json({ error: 'Не удалось проверить ответ' });
    if (!task) return res.status(404).json({ error: 'Задание не найдено' });
    const correct = answer === task.correct_answer;
    if (correct) {
      db.run(`DELETE FROM user_mistakes WHERE user_id = ? AND task_id = ?`, [userId, taskId], finishAnswer);
    } else {
      db.run(
        `INSERT OR IGNORE INTO user_mistakes (user_id, task_id) VALUES (?, ?)`,
        [userId, taskId],
        finishAnswer
      );
    }

    function finishAnswer(updateError) {
      if (updateError) return res.status(500).json({ error: 'Не удалось сохранить результат ответа' });
      res.json({ correct });
    }
  });
});

app.get('/api/user/:id/lesson/:number/tasks', (req, res) => {
  const userId = Number(req.params.id);
  const lessonNumber = Number(req.params.number);

  db.get(`SELECT language FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(
      `SELECT * FROM lessons WHERE language = ? AND lesson_number = ?`,
      [user.language, lessonNumber],
      (err, lesson) => {
        if (err || !lesson) return res.status(404).json({ error: 'Урок не найден' });

        db.all(
          `SELECT * FROM tasks WHERE lesson_id = ? ORDER BY task_number`,
          [lesson.id],
          (err, tasks) => {
            if (err) return res.status(500).json({ error: 'Ошибка сервера' });

            const parsedTasks = (tasks || []).map(t => ({
              ...t,
              options: t.options ? JSON.parse(t.options) : [],
            }));

            res.json({
              lesson: {
                id: lesson.id,
                number: lesson.lesson_number,
                title: lesson.title,
                subtitle: lesson.subtitle,
                xp_reward: lesson.xp_reward,
              },
              tasks: parsedTasks,
            });
          }
        );
      }
    );
  });
});

app.post('/api/register', async (req, res) => {
  const username = sanitizePlainText(req.body.username);
  const email = sanitizePlainText(req.body.email);
  const { password } = req.body;
  if (username.length < 3 || username.length > 32 ||
      email.length > 254 || !email.includes('@') ||
      typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Укажите имя длиной от 3 до 32 символов, действующий адрес электронной почты и пароль не короче 6 символов' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
        }
        const token = jwt.sign({ id: this.lastID, username }, SECRET_KEY, { expiresIn: '7d' });
        res.status(201).json({ message: 'Регистрация успешна', token, userId: this.lastID, username });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/user/:id/language', (req, res) => {
  const { language } = req.body;
  const { id } = req.params;
  if (!['Python', 'JavaScript', 'TypeScript'].includes(language)) {
    return res.status(400).json({ error: 'Неподдерживаемый язык программирования' });
  }
  db.run(
    `UPDATE users SET language = ? WHERE id = ?`,
    [language, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Не удалось обновить язык' });
      res.json({ message: 'Язык успешно сохранен', language });
    }
  );
});

app.patch('/api/user/:id/profile', (req, res) => {
  const username = sanitizePlainText(req.body.username);
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Имя должно содержать от 3 до 32 символов' });
  }

  db.run(
    `UPDATE users SET username = ? WHERE id = ?`,
    [username, req.params.id],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Это имя уже занято' });
      }
      if (err) return res.status(500).json({ error: 'Не удалось обновить профиль' });
      if (!this.changes) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json({ username });
    }
  );
});

app.get('/api/league', (_req, res) => {
  db.all(
    `SELECT id, username, xp, avatar FROM users WHERE is_admin = 0 ORDER BY xp DESC, id ASC`,
    [],
    (err, learners) => {
      if (err) {
        console.error('DB error /api/league:', err.message);
        return res.status(500).json({ error: 'Не удалось загрузить рейтинг' });
      }

      res.json({
        learners: learners.map((learner, index) => ({ ...learner, rank: index + 1 })),
      });
    }
  );
});

app.get('/api/user/:id', (req, res) => {
  const { id } = req.params;
  db.get(
        `SELECT id, username, email, language, current_lesson, total_lessons,
          xp, streak,
          (SELECT COUNT(*) + 1 FROM users AS ranked_users
           WHERE ranked_users.is_admin = 0 AND ranked_users.xp > users.xp) AS rank,
          avatar
     FROM users WHERE id = ? AND is_admin = 0`,
    [id],
    (err, row) => {
      if (err) {
        console.error('DB error /api/user:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', details: err.message });
      }
      if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json(row);
    }
  );
});
// return png or jpg, use path image
// Загрузка / замена аватара
app.post('/api/user/:id/avatar', upload.single('avatar'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Файл не получен' });

  const avatarPath = `/uploads/avatars/${req.file.filename}`;

  // (опционально) удаляем старый файл
  db.get(`SELECT avatar FROM users WHERE id = ?`, [id], (err, row) => {
    if (!err && row?.avatar) {
      const oldFile = path.join(__dirname, row.avatar);
      fs.unlink(oldFile, () => {}); // игнорируем ошибку
    }

    db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarPath, id], function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
      res.json({ avatar: avatarPath });
    });
  });
});

app.get('/api/user/:id/lessons', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT id, language, current_lesson FROM users WHERE id = ?`, [id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
    db.all(
      `SELECT lessons.id, lessons.language, lessons.lesson_number, lessons.title,
         lessons.subtitle, lessons.content, lessons.xp_reward,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM user_progress
             WHERE user_progress.user_id = ? AND user_progress.lesson_id = lessons.id
               AND user_progress.completed = 1
           ) THEN 'completed'
           WHEN lessons.lesson_number = ? THEN 'active'
           ELSE 'locked'
         END AS status
       FROM lessons
       WHERE language = ?
       ORDER BY lesson_number`,
      [user.id, user.current_lesson, user.language],
      (err, lessons) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ lessons, language: user.language });
      }
    );
  });
});

app.get('/api/user/:id/lesson/:number', (req, res) => {
  const userId = Number(req.params.id);
  const lessonNumber = Number(req.params.number);

  db.get(`SELECT language FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(
      `SELECT * FROM lessons WHERE language = ? AND lesson_number = ?`,
      [user.language, lessonNumber],
      (err, lesson) => {
        if (err || !lesson) return res.status(404).json({ error: 'Урок не найден' });
        res.json(lesson);
      }
    );
  });
});

app.post('/api/user/:id/complete-lesson', (req, res) => {
  const userId = Number(req.params.id);
  const lessonNumber = Number(req.body.lessonNumber);
  if (!Number.isInteger(userId) || !Number.isInteger(lessonNumber) || lessonNumber < 1) {
    return res.status(400).json({ error: 'Неверный идентификатор пользователя или номер урока' });
  }

  db.get(`SELECT language, xp FROM users WHERE id = ?`, [userId], (userError, user) => {
    if (userError) return res.status(500).json({ error: 'Не удалось загрузить пользователя' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(
      `SELECT id, xp_reward FROM lessons WHERE language = ? AND lesson_number = ?`,
      [user.language, lessonNumber],
      (lessonError, lesson) => {
        if (lessonError) return res.status(500).json({ error: 'Не удалось загрузить урок' });
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

        db.run(
          `INSERT INTO user_progress (user_id, lesson_id, completed)
           VALUES (?, ?, 1)
           ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1
           WHERE user_progress.completed = 0`,
          [userId, lesson.id],
          function (progressError) {
            if (progressError) return res.status(500).json({ error: 'Не удалось сохранить прогресс урока' });
            const alreadyCompleted = this.changes === 0;
            const xpEarned = alreadyCompleted ? 0 : Number(lesson.xp_reward) || 0;
            const nextNumber = lessonNumber + 1;

            const finishResponse = (totalXP) => res.json({
              message: 'Урок завершён!',
              nextLesson: nextNumber,
              unlocked: true,
              xpEarned,
              previousXP: user.xp,
              totalXP,
              alreadyCompleted,
            });

            db.run(
              `UPDATE users
               SET xp = xp + ?,
                   daily_xp = CASE
                     WHEN daily_xp_date = date('now', 'localtime') THEN daily_xp + ?
                     ELSE ?
                   END,
                   daily_xp_date = date('now', 'localtime'),
                   current_lesson = MAX(current_lesson, ?)
               WHERE id = ?`,
              [xpEarned, xpEarned, xpEarned, nextNumber, userId],
              (updateError) => {
                if (updateError) return res.status(500).json({ error: 'Не удалось обновить прогресс урока' });
                db.get(`SELECT xp FROM users WHERE id = ?`, [userId], (xpError, updatedUser) => {
                  if (xpError || !updatedUser) return res.status(500).json({ error: 'Не удалось загрузить обновлённые очки XP' });
                  finishResponse(updatedUser.xp);
                });
              }
            );
          }
        );
      }
    );
  });
});

app.get('/api/user/:id/goal', (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT daily_goal, daily_minutes,
       CASE WHEN daily_xp_date = date('now', 'localtime') THEN daily_xp ELSE 0 END AS daily_xp
     FROM users WHERE id = ?`,
    [id],
    (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json(row);
    }
  );
});

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  db.get(
    `SELECT * FROM users WHERE email = ? OR username = ?`,
    [login, login],
    async (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Неверный логин или пароль' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });

      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
      res.json({
        token,
        userId: user.id,
        username: user.username,
        language: user.language,
        isAdmin: Boolean(user.is_admin),
        mustChangePassword: Boolean(user.must_change_password),
      });
    }
  );
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ error: 'Новый пароль должен содержать не менее 12 символов' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    db.run(
      `UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?`,
      [passwordHash, req.adminUser.id],
      (updateError) => {
        if (updateError) return res.status(500).json({ error: 'Не удалось изменить пароль' });
        res.json({ message: 'Пароль изменён' });
      }
    );
  } catch {
    res.status(500).json({ error: 'Не удалось изменить пароль' });
  }
});

app.get('/api/admin/users', requireAdmin, requireChangedAdminPassword, (_req, res) => {
  db.all(
    `SELECT id, username, email, language, xp, avatar, is_admin FROM users ORDER BY id`,
    [],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Не удалось загрузить список пользователей' });
      res.json({ users });
    }
  );
});

app.post('/api/admin/users', requireAdmin, requireChangedAdminPassword, async (req, res) => {
  const username = sanitizePlainText(req.body.username);
  const email = sanitizePlainText(req.body.email);
  const { password } = req.body;
  if (username.length < 3 || username.length > 32 ||
      email.length > 254 || !email.includes('@') ||
      typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Укажите имя длиной от 3 до 32 символов, действующий адрес электронной почты и пароль не короче 8 символов' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, passwordHash],
      function (err) {
        if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Это имя или адрес электронной почты уже используется' });
        if (err) return res.status(500).json({ error: 'Не удалось создать пользователя' });
        res.status(201).json({ id: this.lastID, username, email });
      }
    );
  } catch {
    res.status(500).json({ error: 'Не удалось создать пользователя' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const username = sanitizePlainText(req.body.username);
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Имя должно содержать от 3 до 32 символов' });
  }

  db.run(
    `UPDATE users SET username = ? WHERE id = ? AND is_admin = 0`,
    [username, req.params.id],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Это имя уже занято' });
      if (err) return res.status(500).json({ error: 'Не удалось изменить имя пользователя' });
      if (!this.changes) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json({ username });
    }
  );
});

app.delete('/api/admin/users/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить пользователя' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    db.run(`DELETE FROM user_mistakes WHERE user_id = ?`, [req.params.id], (mistakesError) => {
      if (mistakesError) return res.status(500).json({ error: 'Не удалось удалить вопросы для повторения' });
      db.run(`DELETE FROM user_progress WHERE user_id = ?`, [req.params.id], (progressError) => {
        if (progressError) return res.status(500).json({ error: 'Не удалось удалить прогресс пользователя' });
        db.run(`DELETE FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], function (deleteError) {
          if (deleteError) return res.status(500).json({ error: 'Не удалось удалить пользователя' });
          if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
          res.json({ deleted: true });
        });
      });
    });
  });
});

app.post('/api/admin/users/:id/avatar', requireAdmin, requireChangedAdminPassword, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Выберите файл изображения' });
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err || !user) {
      fs.unlink(req.file.path, () => {});
      return res.status(err ? 500 : 404).json({ error: err ? 'Unable to load user' : 'User not found' });
    }
    db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarPath, req.params.id], (updateError) => {
      if (updateError) return res.status(500).json({ error: 'Не удалось сохранить аватар пользователя' });
      if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
      res.json({ avatar: avatarPath });
    });
  });
});

app.delete('/api/admin/users/:id/avatar', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить пользователя' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    db.run(`UPDATE users SET avatar = NULL WHERE id = ?`, [req.params.id], (updateError) => {
      if (updateError) return res.status(500).json({ error: 'Не удалось удалить аватар пользователя' });
      if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
      res.json({ avatar: null });
    });
  });
});

app.get('/api/admin/lessons', requireAdmin, requireChangedAdminPassword, (_req, res) => {
  db.all(`SELECT * FROM lessons ORDER BY language, lesson_number`, [], (err, lessons) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить уроки' });
    res.json({ lessons });
  });
});

app.get('/api/admin/lessons/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.get(`SELECT * FROM lessons WHERE id = ?`, [req.params.id], (lessonError, lesson) => {
    if (lessonError) return res.status(500).json({ error: 'Не удалось загрузить урок' });
    if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
    db.all(
      `SELECT id, type, question, code, options, correct_answer, explanation
       FROM tasks WHERE lesson_id = ? ORDER BY task_number`,
      [lesson.id],
      (taskError, tasks) => {
        if (taskError) return res.status(500).json({ error: 'Не удалось загрузить задания урока' });
        res.json({
          lesson,
          tasks: tasks.map((task) => ({
            ...task,
            options: task.options ? JSON.parse(task.options) : [],
          })),
        });
      }
    );
  });
});

function saveLessonTasks(lessonId, tasks, callback) {
  const statement = db.prepare(
    `INSERT INTO tasks (lesson_id, task_number, type, question, code, options, correct_answer, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let firstError = null;
  tasks.forEach((task, index) => {
    statement.run(
      lessonId,
      index + 1,
      task.type || 'multiple_choice',
      task.question,
      task.code || '',
      JSON.stringify(task.options || []),
      task.correct_answer,
      task.explanation || '',
      (err) => { if (err && !firstError) firstError = err; }
    );
  });
  statement.finalize((err) => callback(err || firstError));
}

const LESSON_TEXT_LIMITS = {
  title: 100,
  subtitle: 180,
  content: 5000,
  question: 1000,
  code: 2000,
  correctAnswer: 300,
  option: 250,
  explanation: 500,
};

function sanitizePlainText(value, multiline = false) {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return multiline ? cleaned : cleaned.replace(/\s+/g, ' ');
}

function isTextWithinLimit(value, limit) {
  return typeof value === 'string' && value.length <= limit;
}

function isOptionalText(value) {
  return value == null || typeof value === 'string';
}

function normalizeLessonTasks(tasks) {
  const validInputs = Array.isArray(tasks) && tasks.every((task) =>
    task && typeof task === 'object' && !Array.isArray(task) &&
    typeof task.question === 'string' && typeof task.correct_answer === 'string' &&
    isOptionalText(task.code) && isOptionalText(task.type) && isOptionalText(task.explanation) &&
    Array.isArray(task.options) && task.options.every((option) => typeof option === 'string')
  );
  const cleanTasks = Array.isArray(tasks) ? tasks.map((task) => ({
    type: typeof task?.type === 'string' ? sanitizePlainText(task.type) : 'multiple_choice',
    question: sanitizePlainText(task?.question, true),
    code: sanitizePlainText(task?.code, true),
    correct_answer: sanitizePlainText(task?.correct_answer),
    explanation: sanitizePlainText(task?.explanation, true),
    options: Array.isArray(task?.options) ? task.options.map((option) => sanitizePlainText(option, true)) : [],
  })) : [];
  const valid = validInputs && cleanTasks.length > 0 && cleanTasks.length <= 30 && cleanTasks.every((task) =>
    isTextWithinLimit(task.question, LESSON_TEXT_LIMITS.question) && task.question &&
    isTextWithinLimit(task.code, LESSON_TEXT_LIMITS.code) &&
    isTextWithinLimit(task.correct_answer, LESSON_TEXT_LIMITS.correctAnswer) && task.correct_answer &&
    isTextWithinLimit(task.explanation, LESSON_TEXT_LIMITS.explanation) &&
    task.options.length >= 2 && task.options.length <= 6 &&
    task.options.every((option) => isTextWithinLimit(option, LESSON_TEXT_LIMITS.option) && option) &&
    task.options.includes(task.correct_answer)
  );
  return valid ? cleanTasks : null;
}

app.post('/api/admin/lessons', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const { language, lesson_number, title, subtitle, content, xp_reward, tasks } = req.body;
  const cleanTitle = sanitizePlainText(title);
  const cleanSubtitle = sanitizePlainText(subtitle);
  const cleanContent = sanitizePlainText(content, true);
  const cleanTasks = normalizeLessonTasks(tasks);
  const xpReward = Number(xp_reward ?? 0);
  if (typeof title !== 'string' || !isOptionalText(subtitle) || !isOptionalText(content) ||
      !['Python', 'JavaScript', 'TypeScript'].includes(language) || !Number.isSafeInteger(Number(lesson_number)) ||
      Number(lesson_number) < 1 || !cleanTitle || !isTextWithinLimit(cleanTitle, LESSON_TEXT_LIMITS.title) ||
      !isTextWithinLimit(cleanSubtitle, LESSON_TEXT_LIMITS.subtitle) ||
      !isTextWithinLimit(cleanContent, LESSON_TEXT_LIMITS.content) ||
      !Number.isSafeInteger(xpReward) || xpReward < 0 || xpReward > 10000 || !cleanTasks) {
    return res.status(400).json({ error: 'Проверьте длину текста урока и добавьте задания с 2–6 вариантами ответа, включая правильный ответ' });
  }

  db.run(
    `INSERT INTO lessons (language, lesson_number, title, subtitle, content, xp_reward)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [language, Number(lesson_number), cleanTitle, cleanSubtitle, cleanContent, xpReward],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Урок с таким номером для этого языка уже существует' });
      if (err) return res.status(500).json({ error: 'Не удалось создать урок' });
      const lessonId = this.lastID;
      saveLessonTasks(lessonId, cleanTasks, (taskError) => {
        if (taskError) {
          db.run(`DELETE FROM tasks WHERE lesson_id = ?`, [lessonId]);
          db.run(`DELETE FROM lessons WHERE id = ?`, [lessonId]);
          return res.status(500).json({ error: 'Не удалось сохранить задания урока' });
        }
        db.run(`UPDATE users SET total_lessons = total_lessons + 1 WHERE language = ?`, [language]);
        res.status(201).json({ id: lessonId });
      });
    }
  );
});

app.patch('/api/admin/lessons/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const { title, subtitle, content, xp_reward, tasks } = req.body;
  const cleanTitle = sanitizePlainText(title);
  const cleanSubtitle = sanitizePlainText(subtitle);
  const cleanContent = sanitizePlainText(content, true);
  const xpReward = Number(xp_reward ?? 0);
  const cleanTasks = normalizeLessonTasks(tasks);
  if (typeof title !== 'string' || !isOptionalText(subtitle) || !isOptionalText(content) ||
      !cleanTitle || !isTextWithinLimit(cleanTitle, LESSON_TEXT_LIMITS.title) ||
      !isTextWithinLimit(cleanSubtitle, LESSON_TEXT_LIMITS.subtitle) ||
      !isTextWithinLimit(cleanContent, LESSON_TEXT_LIMITS.content) ||
      !Number.isSafeInteger(xpReward) || xpReward < 0 || xpReward > 10000 || !cleanTasks) {
    return res.status(400).json({ error: 'Проверьте данные урока и задания: длину текста, правильный ответ и от 2 до 6 вариантов' });
  }
  db.get(`SELECT id FROM lessons WHERE id = ?`, [req.params.id], (lookupError, lesson) => {
    if (lookupError) return res.status(500).json({ error: 'Не удалось проверить урок' });
    if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

    db.serialize(() => {
      db.run('BEGIN IMMEDIATE', (beginError) => {
        if (beginError) return res.status(500).json({ error: 'Не удалось начать изменение урока' });
        db.run(
          `UPDATE lessons SET title = ?, subtitle = ?, content = ?, xp_reward = ? WHERE id = ?`,
          [cleanTitle, cleanSubtitle, cleanContent, xpReward, req.params.id],
          (updateError) => {
            if (updateError) return rollbackLessonEdit(res, 'Не удалось обновить урок');
            db.run(
              `DELETE FROM user_mistakes WHERE task_id IN (SELECT id FROM tasks WHERE lesson_id = ?)`,
              [req.params.id],
              (mistakeError) => {
                if (mistakeError) return rollbackLessonEdit(res, 'Не удалось обновить вопросы для повторения');
                db.run(`DELETE FROM tasks WHERE lesson_id = ?`, [req.params.id], (deleteError) => {
                  if (deleteError) return rollbackLessonEdit(res, 'Не удалось заменить задания урока');
                  saveLessonTasks(req.params.id, cleanTasks, (taskError) => {
                    if (taskError) return rollbackLessonEdit(res, 'Не удалось сохранить задания урока');
                    db.run('COMMIT', (commitError) => {
                      if (commitError) return rollbackLessonEdit(res, 'Не удалось сохранить изменения урока');
                      res.json({ updated: true });
                    });
                  });
                });
              }
            );
          }
        );
      });
    });
  });
});

function rollbackLessonEdit(res, message) {
  db.run('ROLLBACK', (rollbackError) => {
    if (rollbackError) console.error('Unable to roll back lesson edit:', rollbackError.message);
    res.status(500).json({ error: message });
  });
}

app.delete('/api/admin/lessons/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.run(
    `DELETE FROM user_mistakes WHERE task_id IN (SELECT id FROM tasks WHERE lesson_id = ?)`,
    [req.params.id],
    (mistakesError) => {
      if (mistakesError) return res.status(500).json({ error: 'Не удалось удалить вопросы для повторения' });
      db.run(`DELETE FROM tasks WHERE lesson_id = ?`, [req.params.id], (taskError) => {
        if (taskError) return res.status(500).json({ error: 'Не удалось удалить задания урока' });
        db.run(`DELETE FROM user_progress WHERE lesson_id = ?`, [req.params.id], function (progressError) {
          if (progressError) return res.status(500).json({ error: 'Не удалось удалить прогресс урока' });
          db.run(`DELETE FROM lessons WHERE id = ?`, [req.params.id], function (deleteError) {
            if (deleteError) return res.status(500).json({ error: 'Не удалось удалить урок' });
            if (!this.changes) return res.status(404).json({ error: 'Урок не найден' });
            res.json({ deleted: true });
          });
        });
      });
    }
  );
});

const PORT = Number(process.env.PORT) || 5000;
bootstrapAdmin(() => {
  seedTypeScriptCourse((seedError) => {
    if (seedError) {
      console.error('Unable to seed TypeScript lessons:', seedError.message);
      return;
    }
    app.listen(PORT, () => {
      console.log(`Backend запущен на порту ${PORT}`);
    });
  });
});