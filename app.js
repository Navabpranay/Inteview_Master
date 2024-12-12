const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session setup
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Database connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Pranay@35',
    database: 'IMlogins',
    connectionLimit: 10
});

db.getConnection((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Handle login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error during login:', err.message);
            res.status(500).send('Error occurred during login');
        } else if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
            req.session.user = results[0];
            res.redirect('/dashboard');
        } else {
            res.status(401).send('Invalid email or password');
        }
    });
});

// Handle signup
app.post('/signup', (req, res) => {
    const { name, email, phone, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
        [name, email, phone, hashedPassword], (err) => {
            if (err) {
                console.error('Error during signup:', err.message);
                res.status(500).send('Error occurred during signup');
            } else {
                res.send('User registered successfully');
            }
        });
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('dashboard', { user: req.session.user });
});

// Exam route for topic-specific questions
app.get('/exam/:topic', (req, res) => {
    const { topic } = req.params;
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Retrieve questions from the database for the selected topic
    db.query('SELECT * FROM questions WHERE topic = ?', [topic], (err, questions) => {
        if (err) {
            console.error('Error fetching questions:', err.message);
            res.status(500).send('Error occurred while loading exam');
        } else {
            res.render('exam', { topic, questions });
        }
    });
});

// Submit exam and calculate score
// Submit exam and calculate score
app.post('/submit-exam', (req, res) => {
    const { topic } = req.body;
    let score = 0;

    db.query('SELECT * FROM questions WHERE topic = ?', [topic], (err, questions) => {
        if (err) {
            console.error('Error fetching questions:', err.message);
            return res.status(500).send('Error occurred while evaluating exam');
        } 

        const total = questions.length; // Total number of questions

        questions.forEach((question) => {
            // Access each answer using `question_<question.id>`
            const userAnswer = req.body[`question_${question.id}`];

            console.log(`Question ${question.id}: User Answer = ${userAnswer}, Correct Answer = ${question.correct_option}`);

            if (userAnswer === question.correct_option) {
                score += 1; // Increment score if the answer is correct
            }
        });

        // Assign materials based on a 70% score threshold
        const materials = score >= Math.ceil(total * 0.7) ? `Advanced ${topic} materials` : `Beginner ${topic} materials`;
        res.render('results', { topic, score, total, materials });
    });
});



// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err.message);
        }
        res.redirect('/login');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
