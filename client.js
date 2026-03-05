const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameTag');

const GAME_W = 400;
const GAME_H = window.innerHeight;
canvas.width = GAME_W;
canvas.height = GAME_H;

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let myId = Math.random().toString(36).substring(7);
let players = {};
let obstacles = [];

// SPAWN FIX: Place player high enough to be seen
let me = { x: 180, y: 400, w: 30, h: 30, vx: 0, vy: 0, name: "Guest" };
let maxY = me.y; 

nameInput.onkeydown = (e) => {
    if (e.key === 'Enter' && nameInput.value) {
        me.name = nameInput.value.toUpperCase();
        nameInput.disabled = true;
        nameInput.style.display = 'none';
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
    me.vy += 0.7; 
    if (keys['Left']) me.vx = -6;
    else if (keys['Right']) me.vx = 6;
    else me.vx *= 0.85;

    me.x += me.vx;
    if (me.x < 0) me.x = 0;
    if (me.x > GAME_W - me.w) me.x = GAME_W - me.w;

    me.y += me.vy;
    let grounded = false;
    obstacles.forEach(o => {
        if (me.x < o.x + o.w && me.x + me.w > o.x && me.y < o.y + o.h && me.y + me.h > o.y) {
            if (me.vy > 0 && me.y < o.y + (o.h / 2)) { 
                me.y = o.y - me.h; 
                me.vy = 0; 
                grounded = true; 
            }
        }
    });

    if (grounded && keys['Space']) me.vy = -17;
    
    // Camera only moves up
    if (me.y < maxY) maxY = me.y;

    // Death/Respawn if you fall off camera
    if (me.y > maxY + GAME_H) {
        me.y = maxY - 100; // Reset player just above highest point reached
        me.vy = 0;
    }

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Camera
    const camOffset = (GAME_H * 0.7) - maxY;
    ctx.translate(0, camOffset);

    // Draw Platforms
    ctx.fillStyle = "#555";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#0f0";
        ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    // Draw Players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = id === myId ? "#0f0" : "#f00";
        ctx.fillRect(p.x, p.y, 30, 30);
        ctx.fillStyle = "white";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x + 15, p.y - 10);
    }
}
update();
