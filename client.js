const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameTag');
const status = document.getElementById('status');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let myId = Math.random().toString(36).substring(7);
let players = {};
let obstacles = [];
let me = { x: 100, y: 100, vx: 0, vy: 0, name: "Guest" };
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const SPEED = 6;

nameInput.oninput = () => { me.name = nameInput.value || "Guest"; };

let keys = {};
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
};
setupBtn('leftBtn', 'ArrowLeft');
setupBtn('rightBtn', 'ArrowRight');
setupBtn('jumpBtn', 'Space');

socket.onopen = () => status.innerText = "Online";
socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    players = data.players;
    obstacles = data.obstacles;
};

function update() {
    // Horizontal Movement
    if (keys['ArrowLeft']) me.vx = -SPEED;
    else if (keys['ArrowRight']) me.vx = SPEED;
    else me.vx *= 0.8;

    // Physics
    me.vy += GRAVITY;
    me.x += me.vx;
    me.y += me.vy;

    // Simple Floor
    if (me.y > canvas.height - 60) {
        me.y = canvas.height - 60;
        me.vy = 0;
        if (keys['Space']) me.vy = JUMP_FORCE;
    }

    // Keep on screen
    if (me.x < 0) me.x = 0;
    if (me.x > canvas.width - 30) me.x = canvas.width - 30;

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Obstacles
    ctx.fillStyle = "#ffcc00";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
    });

    // Draw Players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = id === myId ? "#00ffcc" : "#ff4444";
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, 30, 30, 5);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x + 15, p.y - 10);
    }
}
update();
