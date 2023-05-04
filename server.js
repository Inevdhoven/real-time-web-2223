import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import handlebars from 'express-handlebars';
// import { router } from './router/routes.js';
import { Server } from 'socket.io';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 4400;
const server = http.createServer(app);
const io = new Server(server);
const __dirname = path.resolve();
const historySize = 50
let history = []

app.set('view engine', 'hbs');
app.set('views', 'views')

app.use('/', express.static(__dirname + '/'));
app.use(express.static(path.resolve('public')));

app.engine('hbs', handlebars.engine({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs',
    defaultLayout: 'index',
    partialsDir: __dirname + '/views/partials',
}))


let books = [];
let currentBook = {}

async function chooseGenre(genre) {
    const bookQueryByGenre = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:${genre}&orderBy=relevance&maxResults=40&key=${process.env.API_KEY}`);
    const result = await bookQueryByGenre.json();
    return result.items.map((item) => item.volumeInfo);
}

function fetchRandomBook() {
    const randomBookIndex = Math.floor(Math.random() * books.length);
    return books[randomBookIndex];
}

app.get('/', async function (req, res) {
    res.render('main', { layout: 'index' });
});

app.get('/raad-het-boek', async function (req, res) {
    const name = req.query.username;
    const genre = req.query.genre;

    books = await chooseGenre(genre);
    console.log('/raad-het-boek, ingeladen boeken: ' + books.length)

    currentBook = fetchRandomBook()
    console.log('/raad-het-boek, random boek: ' + currentBook)

    res.render('genres', { layout: 'index', name: name, genre: genre, result: currentBook });
});

io.on('connection', (socket) => {
    console.log('a user connected');

    // Is er een currentBook? nee? dan fetchrandomBook
    // wel? stuur het huidige currentBook naar de client
    // OP DE CLIENT: voeg het boek toe aan de interface

    socket.emit('history', history);
    // console.log(res.locals.genre);

    socket.on('chat', (data) => {
        console.log(data);
        while (history.length > historySize) {
            history.shift()
        }
        history.push(data)
        io.sockets.emit("chat", data);
    });

    socket.on('typing', (inputName) => {
        console.log("Aan het typen");
        socket.broadcast.emit("typing", inputName);
    });

    socket.on('tryTitleBook', async (titleBook) => {
        console.log(titleBook.toLowerCase());
        const guessedTitleBook = titleBook.toLowerCase();
        const currentBookTitle = currentBook.title.toLowerCase();
        if (guessedTitleBook === currentBookTitle) {
            console.log('Gewonnen');
            socket.emit('win', 'Gewonnen')
        } else {
            console.log('Verloren');
            socket.emit('lose', 'Verloren')
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
});

// app.use('/', router);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
