const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// WebSocket setup
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

let myId = Math.random().toString(36).substring(7);
let players = {};
let myPos = { x: 100, y: 100 };

socket.onopen = () => status.innerText = "Connected!";
socket.onerror = () => status.innerText = "Error Connecting";

socket.onmessage = (event) => {
    players = JSON.parse(event.data);
    draw();
};

function sendMove() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: myId, x: myPos.x, y: myPos.y }));
    }
}

// Mobile Button Logic
const move = (dx, dy) => {
    myPos.x += dx;
    myPos.y += dy;
    sendMove();
};

document.getElementById('up').ontouchstart = () => move(0, -20);
document.getElementById('down').ontouchstart = () => move(0, 20);
document.getElementById('left').ontouchstart = () => move(-20, 0);
document.getElementById('right').ontouchstart = () => move(20, 0);

// Also support Keyboard
window.onkeydown = (e) => {
    if(e.key === "ArrowUp") move(0, -20);
    if(e.key === "ArrowDown") move(0, 20);
    if(e.key === "ArrowLeft") move(-20, 0);
    if(e.key === "ArrowRight") move(20, 0);
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in players) {
        ctx.fillStyle = id === myId ? '#4CAF50' : '#FF5252';
        ctx.fillRect(players[id].x, players[id].y, 30, 30);
        ctx.fillText(id === myId ? "You" : "Player", players[id].x, players[id].y - 5);
    }
}
