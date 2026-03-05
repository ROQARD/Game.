const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameTag');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let myId = Math.random().toString(36).substring(7);
let players = {};
let obstacles = [];
let me = { x: 300, y: 300, w: 40, h: 40, vx: 0, vy: 0, name: "Guest" };
let nameLocked = false;

// Lock name on Enter
nameInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
        me.name = nameInput.value || "Player";
        nameInput.disabled = true;
        nameLocked = true;
        nameInput.style.opacity = "0.5";
    }
};

let keys = {};
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.onpointerdown = (e) => { e.preventDefault(); keys[k] = true; };
    el.onpointerup = (e) => { e.preventDefault(); keys[k] = false; };
};
bind('lBtn', 'Left'); bind('rBtn', 'Right'); bind('jBtn', 'Space');

socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    players = data.players;
    obstacles = data.obstacles;
};

function checkCollision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
    // Gravity & Movement
    me.vy += 0.8;
    if (keys['Left']) me.vx = -6;
    else if (keys['Right']) me.vx = 6;
    else me.vx *= 0.8;

    // Collision X
    me.x += me.vx;
    obstacles.forEach(o => {
        if (checkCollision(me, o)) {
            if (me.vx > 0) me.x = o.x - me.w;
            if (me.vx < 0) me.x = o.x + o.w;
        }
    });

    // Collision Y
    me.y += me.vy;
    let grounded = false;
    obstacles.forEach(o => {
        if (checkCollision(me, o)) {
            if (me.vy > 0) { me.y = o.y - me.h; me.vy = 0; grounded = true; }
            else if (me.vy < 0) { me.y = o.y + o.h; me.vy = 0; }
        }
    });

    if (grounded && keys['Space']) me.vy = -16;
    if (me.x < -50) { me.x = 300; me.y = 300; } // Respawn

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // CAMERA LOGIC: Centering on Y axis
    const camY = canvas.height / 2 - me.y;
    ctx.translate(0, camY);

    // Draw World
    ctx.fillStyle = "#444";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#0f0";
        ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = id === myId ? "#0f0" : "#f00";
        ctx.fillRect(p.x, p.y, me.w, me.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(p.name, p.x, p.y - 10);
    }
}
update();
