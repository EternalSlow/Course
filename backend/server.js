const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.sqlite');

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
    daily_xp INTEGER DEFAULT 0
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

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    task_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
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

const SECRET_KEY = 'your-super-secret-key';

// ---------- API ----------
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
  const { username, email, password } = req.body;
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
        res.status(201).json({ message: 'Регистрация успешна', token, userId: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/user/:id/language', (req, res) => {
  const { language } = req.body;
  const { id } = req.params;
  db.run(
    `UPDATE users SET language = ? WHERE id = ?`,
    [language, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Не удалось обновить язык' });
      res.json({ message: 'Язык успешно сохранен', language });
    }
  );
});

app.get('/api/user/:id', (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT id, username, email, language, current_lesson, total_lessons,
            xp, streak, rank, avatar
     FROM users WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('DB error /api/user:', err.message);
        return res.status(500).json({ error: 'DB error', details: err.message });
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
  db.get(`SELECT language FROM users WHERE id = ?`, [id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
    db.all(
      `SELECT * FROM lessons WHERE language = ? ORDER BY lesson_number`,
      [user.language],
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
  const { id } = req.params;
  const { lessonNumber } = req.body;

  db.run(
    `UPDATE lessons SET status = 'completed'
     WHERE id IN (SELECT id FROM lessons WHERE language = (SELECT language FROM users WHERE id = ?) AND lesson_number = ?)`,
    [id, lessonNumber],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка обновления' });

      const nextNumber = parseInt(lessonNumber) + 1;
      db.run(
        `UPDATE lessons SET status = 'active'
         WHERE id IN (SELECT id FROM lessons WHERE language = (SELECT language FROM users WHERE id = ?) AND lesson_number = ? AND status = 'locked')`,
        [id, nextNumber],
        function (err) {
          if (err) return res.status(500).json({ error: 'Ошибка разблокировки' });

          db.run(`UPDATE users SET current_lesson = ? WHERE id = ?`, [nextNumber, id], () => {
            res.json({ message: 'Урок завершён!', nextLesson: nextNumber, unlocked: true });
          });
        }
      );
    }
  );
});

// ВНИМАНИЕ: колонок daily_goal / daily_minutes / daily_xp нет в таблице users.
// Либо добавь их в CREATE TABLE users, либо раскомментируй запрос ниже —
// но как есть, этот эндпоинт всегда вернёт 404.
app.get('/api/user/:id/goal', (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT daily_goal, daily_minutes, daily_xp FROM users WHERE id = ?`,
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
      });
    }
  );
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend запущен на http://localhost:${PORT}`);
});