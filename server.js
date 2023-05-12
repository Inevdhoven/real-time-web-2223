// Imports
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import handlebars from 'express-handlebars';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import session from 'express-session';

dotenv.config(); // Load .env file

// Variables
const app = express();
const port = process.env.PORT || 4400;
const server = http.createServer(app);
const io = new Server(server);
const __dirname = path.resolve();
const historySize = 50;

let history = [];
let username;
let currentUser;
let users = [];
let genre = 'thriller';
let books = [];
let currentBook = {};
let activeRooms = [];

// App settings
app.set('view engine', 'hbs');
app.set('views', 'views')

app.use('/', express.static(__dirname + '/'));
app.use(express.static(path.resolve('public')));
app.use(session({
    secret: 'geheim',
    resave: false,
    saveUninitialized: true
}));

app.engine('hbs', handlebars.engine({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs',
    defaultLayout: 'index',
    partialsDir: __dirname + '/views/partials',
}))

// Functions
async function fetchGenre(genre) {
    const bookQueryByGenre = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:${genre}&orderBy=relevance&maxResults=20&key=${process.env.API_KEY}`); // Fetch books by genre
    const result = await bookQueryByGenre.json(); // Convert to JSON
    return result.items.map((item) => item.volumeInfo); // Return array of books
}

function getRandomBook() {
    const randomBookIndex = Math.floor(Math.random() * books.length); // Get random book index
    return books[randomBookIndex]; // Return random book
}

// Routes
app.get('/', async function (req, res) {
    res.render('main', { layout: 'index' }); // Render main.hbs
});

// Socket.io
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('getAPI', async () => { // Listen for getAPI
        books = await fetchGenre(genre); // Fetch books by genre

        currentBook = await getRandomBook(); // Get random book

        console.log('Current Book: ' + currentBook);

        socket.emit('randomBook', currentBook); // Send random book to client
    });

    socket.on('newUser', (data) => {
        console.log('new user: ' + data.username);
        username = data.username; // Set username to data.username

        const user = { // Create user object with username and socket id
            username: data.username,
            id: socket.id,
            bookToCheck: ''
        }

        users.push(user); // Push user to users array
        console.log('Users: ' + JSON.stringify(users));

        io.emit('users', users); // Send users to client
    });

    users.forEach((user) => { // Loop through users
        if (user.id === socket.id) { // Check if user id matches socket id
            username = user.username; // Set username to user.username
        }
    });

    socket.on('bookCheck', (usernameInput, bookTitleInput) => { // Listen for bookCheck
        console.log('bookCheck Current User: ' + usernameInput);

        users.forEach((user, i) => { // Loop through users
            console.log(user);
            console.log(usernameInput);
            if (user.username == usernameInput) { // Check if user.username matches usernameInput
                currentUser = usernameInput; // Set currentUser to usernameInput
                user.bookToCheck = bookTitleInput; // Set user.bookToCheck to bookTitleInput
                users[i] = user; // Set users[i] to user
                console.log('bookCheck ' + JSON.stringify(users));
            }
        });
        console.log(users);
    });

    socket.emit('openChat', currentUser); // Send currentUser to client

    socket.emit('history', history); // Send history to client

    socket.on('tryTitleBook', async (titleBook, usernameInput) => {
        console.log(titleBook.toLowerCase());
        const guessedTitleBook = titleBook.toLowerCase(); // Set guessedTitleBook to titleBook.toLowerCase()
        let book = ''; // Set book to empty string
        users.forEach((user) => { // Loop through users
            if (user.username == usernameInput) { // Check if user.username matches usernameInput
                console.log('BookCheck user book ' + user.bookToCheck);
                book = user.bookToCheck // Set book to user.bookToCheck
            }
        });

        const currentBookTitle = book; // Set currentBookTitle to book
        console.log('currentBookTitle: ' + currentBookTitle);
        const currentBookTitleLowerCase = currentBookTitle.toLowerCase(); // Set currentBookTitleLowerCase to currentBookTitle.toLowerCase()

        if (guessedTitleBook === currentBookTitleLowerCase) { // Check if guessedTitleBook matches currentBookTitleLowerCase
            console.log('Gewonnen', currentBookTitle);
            socket.emit('win', currentBookTitle); // Send currentBookTitle to client if guessedTitleBook matches currentBookTitleLowerCase
        } else {
            console.log('Verloren');
            socket.emit('lose', currentBookTitle); // Send currentBookTitle to client if guessedTitleBook does not match currentBookTitleLowerCase
        }
    });

    socket.on('createRoom', (roomName) => {
        console.log(`Creating room ${roomName} for user ${username}`);
        const socketRooms = socket.rooms; // Set socketRooms to socket.rooms
        console.log('socket rooms' + socketRooms);
        console.log('Current User createRoom: ' + currentUser)

        if (!roomName) { // Check if roomName is empty
            console.log('No roomname');
            return;
        }

        if (activeRooms.includes(roomName)) { // Check if activeRooms includes roomName
            console.log(`User ${username} joined room ${roomName}`);
            socket.join(`${roomName}`); // Join room
            socket.emit("roomJoined", roomName, username); // Send roomName and username to client
        } else { // If activeRooms does not include roomName
            console.log(`Room ${roomName} does not exist yet + ${username}`);
            activeRooms.push(roomName); // Push roomName to activeRooms
            console.log('Activerooms:' + activeRooms);
            socket.emit('roomCreated', roomName, username); // Send roomName and username to client
        }
    });

    socket.on('chat', (data) => {
        // console.log(JSON.stringify(data) + ' username: ' + username);
        username = data.username; // Set username to data.username
        while (history.length > historySize) { // Check if history.length is greater than historySize
            history.shift(); // Remove first item from history
        }
        history.push(data); // Push data to history
        console.log('chat ' + username + ' ' + data);
        io.sockets.emit("chat", data, username); // Send data and username to client
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data); // Send data to client
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping'); // Send stopTyping to client
    });

    socket.on('disconnect', () => {
        console.log('user disconnected'); // Log user when disconnected
    })
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`); // Log port when server is running
});
