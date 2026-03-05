const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');

// Full browser sizing
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let gameStarted = false;
let myId = Math.random().toString(36).substring(7);
let players = {};
let obstacles = [];
let me = { x: window.innerWidth / 2, y: 400, w: 35, h: 35, vx: 0, vy: 0, name: "" };
let camY = me.y;

// Load saved name
const savedName = localStorage.getItem('player_name');
if (savedName) nameInput.value = savedName;

startBtn.onclick = () => {
    if (nameInput.value.trim().length > 0) {
        me.name = nameInput.value.toUpperCase();
        localStorage.setItem('player_name', me.name); // Save to device
        overlay.style.display = 'none';
        gameStarted = true;
    }
};

let keys = {};
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[k] = true; }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[k] = false; }, {passive: false});
};
bind('lBtn', 'Left'); bind('rBtn', 'Right'); bind('jBtn', 'Space');

socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    players = data.players;
    obstacles = data.obstacles;
};

function update() {
    if (!gameStarted) return requestAnimationFrame(update);

    me.vy += 0.7; 
    if (keys['Left']) me.vx = -7;
    else if (keys['Right']) me.vx = 7;
    else me.vx *= 0.85;

    me.x += me.vx;
    if (me.x < 0) me.x = 0;
    if (me.x > canvas.width - me.w) me.x = canvas.width - me.w;

    me.y += me.vy;
    let grounded = false;
    obstacles.forEach(o => {
        if (me.x < o.x + o.w && me.x + me.w > o.x && me.y < o.y + o.h && me.y + me.h > o.y) {
            if (me.vy > 0 && me.y < o.y + (o.h / 2)) { 
                me.y = o.y - me.h; me.vy = 0; grounded = true; 
            }
        }
    });

    if (grounded && keys['Space']) me.vy = -18;
    
    // Smooth Camera Follow (Up and Down)
    const targetCamY = me.y - (canvas.height * 0.6);
    camY += (targetCamY - camY) * 0.1;

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(0, -camY);

    // Draw Platforms
    ctx.fillStyle = "#444";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#0f0";
        ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    // Draw Players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = id === myId ? "#0f0" : "#f00";
        ctx.fillRect(p.x, p.y, me.w, me.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 10);
    }
}
update();
