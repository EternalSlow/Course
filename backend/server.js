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

function bootstrapAdmin(onReady) {
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Unable to check user schema:', err.message);
      return onReady();
    }

    const names = new Set(columns.map((column) => column.name));
    const missingColumns = [
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

      db.get(`SELECT id FROM users WHERE is_admin = 1 LIMIT 1`, async (adminError, admin) => {
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
    };

    addMissingColumn(0);
  });
}

function requireAdmin(req, res, next) {
  const match = (req.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Sign in required' });

  jwt.verify(match[1], SECRET_KEY, (tokenError, payload) => {
    if (tokenError) return res.status(401).json({ error: 'Invalid session' });
    db.get(
      `SELECT id, is_admin, must_change_password FROM users WHERE id = ?`,
      [payload.id],
      (dbError, user) => {
        if (dbError) return res.status(500).json({ error: 'Unable to check admin access' });
        if (!user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
        req.adminUser = user;
        next();
      }
    );
  });
}

function requireChangedAdminPassword(req, res, next) {
  if (req.adminUser.must_change_password) {
    return res.status(428).json({ error: 'Change the admin password before using this page' });
  }
  next();
}

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

app.patch('/api/user/:id/profile', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Name must contain 3 to 32 characters' });
  }

  db.run(
    `UPDATE users SET username = ? WHERE id = ?`,
    [username, req.params.id],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'That name is already in use' });
      }
      if (err) return res.status(500).json({ error: 'Unable to update profile' });
      if (!this.changes) return res.status(404).json({ error: 'User not found' });
      res.json({ username });
    }
  );
});

app.get('/api/league', (_req, res) => {
  db.all(
    `SELECT id, username, xp, avatar FROM users ORDER BY xp DESC, id ASC`,
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
          (SELECT COUNT(*) + 1 FROM users AS ranked_users WHERE ranked_users.xp > users.xp) AS rank,
          avatar
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
  const userId = Number(req.params.id);
  const lessonNumber = Number(req.body.lessonNumber);
  if (!Number.isInteger(userId) || !Number.isInteger(lessonNumber) || lessonNumber < 1) {
    return res.status(400).json({ error: 'Invalid user or lesson number' });
  }

  db.get(`SELECT language, xp FROM users WHERE id = ?`, [userId], (userError, user) => {
    if (userError) return res.status(500).json({ error: 'Unable to load user' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(
      `SELECT id, xp_reward FROM lessons WHERE language = ? AND lesson_number = ?`,
      [user.language, lessonNumber],
      (lessonError, lesson) => {
        if (lessonError) return res.status(500).json({ error: 'Unable to load lesson' });
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

        db.run(
          `INSERT INTO user_progress (user_id, lesson_id, completed)
           VALUES (?, ?, 1)
           ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1
           WHERE user_progress.completed = 0`,
          [userId, lesson.id],
          function (progressError) {
            if (progressError) return res.status(500).json({ error: 'Unable to record lesson progress' });
            const xpEarned = this.changes ? Number(lesson.xp_reward) || 0 : 0;
            const nextNumber = lessonNumber + 1;

            const finishResponse = (totalXP) => res.json({
              message: 'Урок завершён!',
              nextLesson: nextNumber,
              unlocked: true,
              xpEarned,
              previousXP: user.xp,
              totalXP,
              alreadyCompleted: xpEarned === 0,
            });

            const updateProgression = () => {
              db.run(
                `UPDATE lessons SET status = 'completed' WHERE id = ?`,
                [lesson.id],
                (completeError) => {
                  if (completeError) return res.status(500).json({ error: 'Unable to complete lesson' });
                  db.run(
                    `UPDATE lessons SET status = 'active'
                     WHERE language = ? AND lesson_number = ? AND status = 'locked'`,
                    [user.language, nextNumber],
                    (unlockError) => {
                      if (unlockError) return res.status(500).json({ error: 'Unable to unlock next lesson' });
                      db.get(`SELECT xp FROM users WHERE id = ?`, [userId], (xpError, updatedUser) => {
                        if (xpError || !updatedUser) return res.status(500).json({ error: 'Unable to load updated XP' });
                        finishResponse(updatedUser.xp);
                      });
                    }
                  );
                }
              );
            };

            if (xpEarned > 0) {
              db.run(
                `UPDATE users SET xp = xp + ?, current_lesson = ? WHERE id = ?`,
                [xpEarned, nextNumber, userId],
                (xpError) => {
                  if (xpError) return res.status(500).json({ error: 'Unable to award XP' });
                  updateProgression();
                }
              );
            } else {
              db.run(`UPDATE users SET current_lesson = ? WHERE id = ?`, [nextNumber, userId], (updateError) => {
                if (updateError) return res.status(500).json({ error: 'Unable to update lesson progress' });
                updateProgression();
              });
            }
          }
        );
      }
    );
  });
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
        isAdmin: Boolean(user.is_admin),
        mustChangePassword: Boolean(user.must_change_password),
      });
    }
  );
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must contain at least 12 characters' });
  }

  db.get(`SELECT password FROM users WHERE id = ?`, [req.adminUser.id], async (err, row) => {
    if (err || !row) return res.status(500).json({ error: 'Unable to check current password' });
    if (!await bcrypt.compare(currentPassword || '', row.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      db.run(
        `UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?`,
        [passwordHash, req.adminUser.id],
        (updateError) => {
          if (updateError) return res.status(500).json({ error: 'Unable to update password' });
          res.json({ message: 'Password changed' });
        }
      );
    } catch {
      res.status(500).json({ error: 'Unable to update password' });
    }
  });
});

app.get('/api/admin/users', requireAdmin, requireChangedAdminPassword, (_req, res) => {
  db.all(
    `SELECT id, username, email, language, xp, avatar, is_admin FROM users ORDER BY id`,
    [],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Unable to load users' });
      res.json({ users });
    }
  );
});

app.post('/api/admin/users', requireAdmin, requireChangedAdminPassword, async (req, res) => {
  const { username, email, password } = req.body;
  if (typeof username !== 'string' || username.trim().length < 3 ||
      typeof email !== 'string' || !email.includes('@') ||
      typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password of at least 8 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username.trim(), email.trim(), passwordHash],
      function (err) {
        if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Name or email is already in use' });
        if (err) return res.status(500).json({ error: 'Unable to create user' });
        res.status(201).json({ id: this.lastID, username: username.trim(), email: email.trim() });
      }
    );
  } catch {
    res.status(500).json({ error: 'Unable to create user' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Name must contain 3 to 32 characters' });
  }

  db.run(
    `UPDATE users SET username = ? WHERE id = ? AND is_admin = 0`,
    [username, req.params.id],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Name is already in use' });
      if (err) return res.status(500).json({ error: 'Unable to rename user' });
      if (!this.changes) return res.status(404).json({ error: 'User not found' });
      res.json({ username });
    }
  );
});

app.delete('/api/admin/users/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Unable to load user' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.run(`DELETE FROM user_progress WHERE user_id = ?`, [req.params.id], (progressError) => {
      if (progressError) return res.status(500).json({ error: 'Unable to remove user progress' });
      db.run(`DELETE FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], function (deleteError) {
        if (deleteError) return res.status(500).json({ error: 'Unable to delete user' });
        if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
        res.json({ deleted: true });
      });
    });
  });
});

app.post('/api/admin/users/:id/avatar', requireAdmin, requireChangedAdminPassword, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file required' });
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err || !user) {
      fs.unlink(req.file.path, () => {});
      return res.status(err ? 500 : 404).json({ error: err ? 'Unable to load user' : 'User not found' });
    }
    db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarPath, req.params.id], (updateError) => {
      if (updateError) return res.status(500).json({ error: 'Unable to save user icon' });
      if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
      res.json({ avatar: avatarPath });
    });
  });
});

app.delete('/api/admin/users/:id/avatar', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.get(`SELECT avatar FROM users WHERE id = ? AND is_admin = 0`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Unable to load user' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.run(`UPDATE users SET avatar = NULL WHERE id = ?`, [req.params.id], (updateError) => {
      if (updateError) return res.status(500).json({ error: 'Unable to remove user icon' });
      if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
      res.json({ avatar: null });
    });
  });
});

app.get('/api/admin/lessons', requireAdmin, requireChangedAdminPassword, (_req, res) => {
  db.all(`SELECT * FROM lessons ORDER BY language, lesson_number`, [], (err, lessons) => {
    if (err) return res.status(500).json({ error: 'Unable to load lessons' });
    res.json({ lessons });
  });
});

function saveLessonTasks(lessonId, tasks, callback) {
  const statement = db.prepare(
    `INSERT INTO tasks (lesson_id, task_number, type, question, options, correct_answer, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  let firstError = null;
  tasks.forEach((task, index) => {
    statement.run(
      lessonId,
      index + 1,
      task.type || 'multiple_choice',
      task.question,
      JSON.stringify(task.options || []),
      task.correct_answer,
      task.explanation || '',
      (err) => { if (err && !firstError) firstError = err; }
    );
  });
  statement.finalize((err) => callback(err || firstError));
}

app.post('/api/admin/lessons', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const { language, lesson_number, title, subtitle, content, xp_reward, tasks } = req.body;
  const validTasks = Array.isArray(tasks) && tasks.length > 0 && tasks.every((task) =>
    typeof task.question === 'string' && task.question.trim() &&
    typeof task.correct_answer === 'string' && task.correct_answer.trim() &&
    Array.isArray(task.options)
  );
  if (!['Python', 'JavaScript'].includes(language) || !Number.isInteger(Number(lesson_number)) ||
      Number(lesson_number) < 1 || !String(title || '').trim() || !validTasks) {
    return res.status(400).json({ error: 'Enter lesson details and at least one valid task' });
  }

  db.run(
    `INSERT INTO lessons (language, lesson_number, title, subtitle, content, xp_reward)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [language, Number(lesson_number), title.trim(), subtitle || '', content || '', Math.max(0, Number(xp_reward) || 0)],
    function (err) {
      if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'That lesson number already exists for this language' });
      if (err) return res.status(500).json({ error: 'Unable to create lesson' });
      const lessonId = this.lastID;
      saveLessonTasks(lessonId, tasks, (taskError) => {
        if (taskError) {
          db.run(`DELETE FROM tasks WHERE lesson_id = ?`, [lessonId]);
          db.run(`DELETE FROM lessons WHERE id = ?`, [lessonId]);
          return res.status(500).json({ error: 'Unable to save lesson tasks' });
        }
        db.run(`UPDATE users SET total_lessons = total_lessons + 1 WHERE language = ?`, [language]);
        res.status(201).json({ id: lessonId });
      });
    }
  );
});

app.patch('/api/admin/lessons/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  const { title, subtitle, content, xp_reward } = req.body;
  if (!String(title || '').trim()) return res.status(400).json({ error: 'Lesson title is required' });
  db.run(
    `UPDATE lessons SET title = ?, subtitle = ?, content = ?, xp_reward = ? WHERE id = ?`,
    [title.trim(), subtitle || '', content || '', Math.max(0, Number(xp_reward) || 0), req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Unable to update lesson' });
      if (!this.changes) return res.status(404).json({ error: 'Lesson not found' });
      res.json({ updated: true });
    }
  );
});

app.delete('/api/admin/lessons/:id', requireAdmin, requireChangedAdminPassword, (req, res) => {
  db.run(`DELETE FROM tasks WHERE lesson_id = ?`, [req.params.id], (taskError) => {
    if (taskError) return res.status(500).json({ error: 'Unable to remove lesson tasks' });
    db.run(`DELETE FROM user_progress WHERE lesson_id = ?`, [req.params.id], function (progressError) {
      if (progressError) return res.status(500).json({ error: 'Unable to remove lesson progress' });
      db.run(`DELETE FROM lessons WHERE id = ?`, [req.params.id], function (deleteError) {
        if (deleteError) return res.status(500).json({ error: 'Unable to delete lesson' });
        if (!this.changes) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ deleted: true });
      });
    });
  });
});

const PORT = Number(process.env.PORT) || 5000;
bootstrapAdmin(() => {
  app.listen(PORT, () => {
    console.log(`Backend запущен на http://localhost:${PORT}`);
  });
});