// Variables
const socket = io();
const usernameSection = document.querySelector('.username');
const guessBookSection = document.querySelector('.guess-book');
const chatSection = document.querySelector('.chat');

const startGame = document.querySelector('button#start-game');
const formUsername = document.querySelector('form#form-username');
const bookImage = document.querySelector('img.book-image');
const titleBook = document.querySelector('input#title');
const titleBtn = document.querySelector('button#title-btn');
const guessBook = document.querySelector('.guess-book section');
const guessForm = document.querySelector('.guess-book form');
const bookSection = document.querySelector('.guess-book section');
const gameText = document.getElementById('game-text');
const openChatButton = document.getElementById('open-chat');
const retryButton = document.getElementById('retry');
const bookTitleInput = document.querySelector('input[name="booktitle"]');
const usernameInput = document.querySelector('input[name="username"]');

let messages = document.querySelector('.chat section ul');
let inputName = document.querySelector('.chat input#username');
let inputText = document.querySelector('.chat input#message');
let send = document.querySelector('.chat button#send');
let typingState = document.querySelector('.chat p');
let chatForm = document.querySelector('.chat form');
const bookTitle = document.querySelector('input#book-title');

let username;
let currentUser;
let genre;
let users = [];
let numUsers = 0;
let genreChosen = false;
let loses = 0;
let currentBook;

getAPI();

// Socket Events
if (startGame) { // Check if startGame exists
  formUsername.addEventListener('submit', (e) => { // Listen for submit event on formUsername
    e.preventDefault();
    const inputUsername = document.querySelector('input#username');
    username = inputUsername.value; // Set username to value of inputUsername
    socket.emit('newUser', { username: username }); // Send username to server
    usernameSection.setAttribute('class', 'username hidden'); // Show usernameSection
    guessBookSection.setAttribute('class', 'guess-book show'); // Show guessBookSection

    const usernameBookPage = document.querySelector('span.username');

    usernameBookPage.textContent = username; // Set textContent of usernameBookPage to username

    usernameInput.value = username; // Set value of unsernameInput to username

    showNewBook()
  });
}


// Functions
function guessNewBook() {
  // New book to guess
  retryButton.addEventListener('click', (e) => {
    e.preventDefault();
    guessForm.setAttribute('class', 'show');
    titleBook.value = ''; // Set value of bookTitleInput to empty string
    gameText.setAttribute('class', 'hidden'); // Hide gameText
    bookImage.classList.remove('win', 'lose1', 'lose2', 'lose3', 'lose4'); // Remove win class from bookImage
    getAPI();
  });
}

function getAPI() {
  socket.emit('getAPI'); // Send getAPI to server
}

function showNewBook() {
  bookTitleInput.value = currentBook.title; // Set value of bookTitleInput to currentBook.title
  bookImage.setAttribute('src', currentBook.imageLinks.thumbnail); // Set src of bookImage to data.image
  bookImage.setAttribute('alt', currentBook.title); // Set alt of bookImage to data.title 

  socket.emit('bookCheck', username, bookTitleInput.value); // Send username and bookTitleInput.value to server
}

socket.on('randomBook', (data) => {
  // console.table(data);
  currentBook = data; // Set currentBook to data
  showNewBook(); // Call showNewBook function
});

socket.on('users', (data) => {
  users = data; // Set users to data

  console.log('Users' + JSON.stringify(users)); // Log users
});

if (titleBtn) { // Check if titleBtn exists
  titleBtn.addEventListener('click', (e) => { // Listen for click event on titleBtn
    e.preventDefault();
    socket.emit('tryTitleBook', titleBook.value, usernameInput.value); // Send titleBook to server
  });
}

if (openChatButton) {
  openChatButton.addEventListener('click', (e) => {
    if (!currentBook) return; // Check if currentBook exists
    // const roomName = currentBook; // Set roomName to currentBook

    // socket.emit('createRoom', roomName); // Create room
    // console.log('Room created: ' + roomName);

    const body = document.querySelector('body');
    body.setAttribute('class', 'chat-open'); // Set class on body
    guessBookSection.setAttribute('class', 'guess-book hidden'); // Hide bookSection
    chatSection.setAttribute('class', 'chat show'); // Show chatSection
  });
}

socket.on('openChat', (currentUser) => {
  // console.log('Open chat ' + currentUser);
  if (chatForm) {
    chatForm.addEventListener('submit', event => { // Listen for submit event on chatForm
      event.preventDefault()
      let data = { name: username, message: inputText.value } // Set data to username and inputText.value
      socket.emit('chat', data); // Send data to server
      // console.log(username, inputText.value);
      inputText.value = ''; // Set value of inputText to empty string
    })
  }
});


socket.on('win', (data) => {
  // console.log('Win ' + data);
  currentBook = data; // Set currentBook to data

  bookImage.classList.add('win'); // Add win class to bookImage
  guessForm.setAttribute('class', 'hidden'); // Hide guessForm
  gameText.setAttribute('class', 'show'); // Show gameText
  gameText.textContent = 'Gewonnen! Het antwoord was ' + currentBook; // Set textContent of gameText
  openChatButton.setAttribute('class', 'show'); // Show openChatButton
  retryButton.setAttribute('class', 'show'); // Show retryButton

  guessNewBook() // Call guessNewBook function
});

socket.on('lose', (data) => {
  // console.log('Verloren ' + data);
  currentBook = data; // Set currentBook to data
  loses++; // Add 1 to loses
  if (loses <= 3) { // Check if loses is less than or equal to 3
    bookImage.classList.add('lose' + loses); // Add lose class to bookImage that counts up
    gameText.setAttribute('class', 'show'); // show gameText
    gameText.textContent = 'Helaas het gegeven antwoord is incorrect. Probeer het nog een keer.'; // Set textContent of gameText
  } else if (loses === 4) { // Check if loses is equal to 4
    bookImage.classList.add('lose4'); // Add lose4 class to bookImage
    guessForm.setAttribute('class', 'hidden'); // Hide guessForm

    gameText.setAttribute('class', 'show'); // Show gameText
    gameText.textContent = 'Helaas je hebt het antwoord niet geraden. Het antwoord was ' + currentBook; // Set textContent of gameText
    openChatButton.setAttribute('class', 'show'); // Show openChatButton
    retryButton.setAttribute('class', 'show'); // Show retryButton

    guessNewBook() // Call guessNewBook function
  }
});

socket.on('roomCreated', (roomName, username) => {
  console.log('Room created: ' + roomName + ' with user ' + username);
});

socket.on("roomJoined", ({ roomName, username }) => {
  console.log(`${username} joined room ${roomName}`);
});

if (inputText) {
  inputText.addEventListener('keypress', () => {
    socket.emit('typing', currentUser) // Send typing with currentUser to server on keypress
  })
}

socket.on('history', (history) => {
  history.forEach((data) => {
    addMessage(data) // Call addMessage function
  })
});

socket.on('chat', (data, username) => {
  let li = document.createElement('li'); // Create li element
  li.innerHTML = `<p id="name">${data.name}</p><p id="message"></p>: ${data.message}`; // Set textContent of li to data.name and data.message
  console.log(data.name + ': ' + data.message) // Log data.name and data.message

  // Check if the message is sent by the user
  if (data.name === username) {
    console.log('Current user is: ' + username);
    li.classList.add('current-user');
  }

  messages.appendChild(li); // Append li to messages
  typingState.innerHTML = ""; // Set innerHTML of typingState to empty string
  messages.scrollTop = messages.scrollHeight; // Set scrollTop of messages to scrollHeight
});

let typingTimer;
const typingDelay = 3000; // when user stops typing, after 3 seconds, the typing state will be cleared

inputText.addEventListener('keydown', () => {
  clearTimeout(typingTimer); // Clear timeout of typingTimer

  typingState.textContent = ''; // Set textContent of typingState to empty string

  typingTimer = setTimeout(() => { // Set timeout of typingTimer
    socket.emit('stopTyping'); // Send stopTyping to server
  }, typingDelay); // Set timeout to typingDelay of 3000

  socket.emit('typing', { username: username }); // Send typing with username to server
});

socket.on('typing', (data) => {
  typingState.textContent = `${data.username} is typing...`; // Set textContent of typingState to data.username is typing...
});

socket.on('stopTyping', () => {
  typingState.textContent = ''; // Set textContent of typingState to empty string
});

function addMessage(data) {
  messages.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<p id="name">${data.name}</p><p id="message"></p>: ${data.message}` })) // Append li to messages
  messages.scrollTop = messages.scrollHeight // Set scrollTop of messages to scrollHeight
}