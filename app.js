const express = require('express');
const mysql = require('mysql2');
const ejs = require('ejs');
const crypto = require('crypto');

const portNumber = 3000;
const ipAddress = '127.0.0.1';

function getAbsoluteUrl(uri) {
  return 'http://' + ipAddress + ':' + portNumber + '/' + uri;
}

// contenitore delle sessioni: sessionId -> email
const sessions = {};

// genera un token univoco per la sessione
function createSessionId() {
    let token = "";
    do {
        token = crypto.randomBytes(16).toString('hex');
    } while(sessions[token] !== undefined)

    return token;
}

// *********************************************************
// ********************** Middleware ***********************
// *********************************************************
// Funzione Middleware che controlla se l'utente
// possiede una sessione attiva
// in caso positivo fa continuare la navigazione
// altrimenti la blocca
function authMiddleware(req, res, next) {
    const cookie = req.headers.cookie;
    if (!cookie) return res.status(401).send('Not authenticated');

    console.log("Il cookie vale:");
    console.log(cookie);

    const sessionId = cookie.split('=')[1];
    if (sessions[sessionId]) {
        res.locals.user = sessions[sessionId]; // da sessione
        next();
    } else {
        res.status(401).send('Invalid session');
    }
}

// nuova app EXPRESS
const app = express();

app.locals.baseUrl = getAbsoluteUrl('');

// Configura la directory per i file statici (css, js)
app.use(express.static('public'))

// Middleware che automaticamente effettua il parsing dei parametri
// inviati via HTTP dal form e crea un oggetto JS che li contiene
app.use(express.urlencoded({ extended: true }));

// ejs è il Template Engine che consente di fondere HTML e JS server side
app.set('view engine', 'ejs');

// Configura connessione al DB MySQL
const db = mysql.createConnection({
  host: '10.211.55.3',
  user: 'root',        // <-- cambia con il tuo utente
  password: '',        // <-- cambia con la tua password
  database: 'pokemons_db' // <-- nome del tuo database
});

// Crea la connessione al database
db.connect((err) => {
  if (err) {
    console.error('Errore di connessione al database:', err);
    return;
  }
  console.log('Connesso al database MySQL!');
});

// Route: GET /pokemons
app.get('/', (req, res) => {
    // mostra i risultati usando la pagina index.ejs
    res.render('index', { })
});

// Route: GET /login
app.get('/do-login', (req, res) => {
    const email = req.query.email;         // 'email'
    const password = req.query.password; // 'password'

    const params = [email, password];

    const q = "SELECT * FROM users WHERE email = ? AND password = password(?)";
    //const q = "SELECT * FROM users WHERE email = '" + email + "'" + " AND password = password(" + password + ")";
    db.query(q, params, (err, results) => {
        if(results.length == 0) {
            res.render('login', { email, password, success: false })
        } else {
            // creo il token di sessione
            const sessionId = createSessionId();
            // aggiorno l'array delle sessioni
            sessions[sessionId] = email;
            // imposto il cookie
            res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly`);

            res.render('login', { email, password, success: true })
        }
    })
});

// *********************************************************
// ******************** Cos'è un cookie ********************
// *********************************************************
// Un cookie nel protocollo HTTP
// è un piccolo file di testo che il server 
// invia al client (di solito un browser)
// per memorizzare informazioni tra una richiesta e l’altra.
// I cookie sono uno dei principali meccanismi
// per implementare sessioni, autenticazione
// e preferenze utente sul web.

// Route: POST /login
app.post('/do-login', (req, res) => {
    // il server riceve ed estrae i parametri compilati nel form dall'utente
    // ed inviati via HTTP (method POST)
    const email = req.body.email;
    const password = req.body.password;

    const params = [email, password];

    const q = "SELECT * FROM users WHERE email = ? AND password = password(?)";
    //const q = "SELECT * FROM users WHERE email = '" + email + "'" + " AND password = password(" + password + ")";
    db.query(q, params, (err, results) => {
        if(results.length == 0) {
            res.render('login', { email, password, success: false })
        } else {
            // creo il token di sessione
            const sessionId = createSessionId();
            // aggiorno l'array delle sessioni
            sessions[sessionId] = email;
            // imposto il cookie
            res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly`);

            res.render('login', { email, password, success: true })
        }
    })
});

app.get('/protected-area', authMiddleware, (req, res) => {
    
    console.log(req.user);

    res.render('protected', { })
});

app.get('/logout', authMiddleware, (req, res) => {
    const sessionId = req.headers.cookie.split('=')[1];
    delete sessions[sessionId];
    res.setHeader('Set-Cookie', 'sessionId=; Max-Age=0');
    res.send('Logged out');
});

// Avvio Web Server nella porta 3000 e IP 127.0.0.1
app.listen(portNumber, ipAddress, () => {
  console.log('Server avviato su http://' + ipAddress + ':' + portNumber);
});
