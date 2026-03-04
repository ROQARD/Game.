const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Replace with your actual Worker URL after deploying
const socket = new WebSocket(`wss://${window.location.host}/ws`);

let players = {};
let myId = Math.random().toString(36).substring(7);

socket.onmessage = (event) => {
    players = JSON.parse(event.data);
    draw();
};

window.addEventListener('mousemove', (e) => {
    const data = { id: myId, x: e.clientX, y: e.clientY };
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in players) {
        ctx.fillStyle = id === myId ? '#00ff00' : '#ff0000';
        ctx.fillRect(players[id].x - 10, players[id].y - 10, 20, 20);
    }
}
