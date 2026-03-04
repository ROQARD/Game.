const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debug = document.getElementById('debug');
const nameInput = document.getElementById('nameTag');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let myId = Math.random().toString(36).substring(7);
let players = {};
let obstacles = [];
let me = { x: 200, y: 100, w: 30, h: 30, vx: 0, vy: 0, name: "Player" };
const GRAVITY = 0.8;

nameInput.oninput = () => me.name = nameInput.value || "Player";

let keys = {};
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.onpointerdown = (e) => { e.preventDefault(); keys[k] = true; };
    el.onpointerup = () => keys[k] = false;
};
bind('lBtn', 'Left'); bind('rBtn', 'Right'); bind('jBtn', 'Space');

socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    players = data.players;
    obstacles = data.obstacles;
    debug.innerText = "Online - Players: " + Object.keys(players).length;
};

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.w && obj1.x + obj1.w > obj2.x &&
           obj1.y < obj2.y + obj2.h && obj1.y + obj1.h > obj2.y;
}

function update() {
    // Movement
    if (keys['Left']) me.vx = -5;
    else if (keys['Right']) me.vx = 5;
    else me.vx *= 0.8;

    me.vy += GRAVITY;
    
    // Move X and check collision
    me.x += me.vx;
    obstacles.forEach(o => {
        if (checkCollision(me, o)) {
            if (me.vx > 0) me.x = o.x - me.w;
            if (me.vx < 0) me.x = o.x + o.w;
        }
    });

    // Move Y and check collision
    me.y += me.vy;
    let onGround = false;
    obstacles.forEach(o => {
        if (checkCollision(me, o)) {
            if (me.vy > 0) {
                me.y = o.y - me.h;
                me.vy = 0;
                onGround = true;
            }
            if (me.vy < 0) {
                me.y = o.y + o.h;
                me.vy = 0;
            }
        }
    });

    if (onGround && keys['Space']) me.vy = -16;

    // Death: If pushed off screen
    if (me.x < -40) { me.x = 200; me.y = 100; }

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Obstacles
    ctx.fillStyle = "#555";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    // Draw Players
    for (let id in players) {
        let p = players[id];
        ctx.fillStyle = id === myId ? "#0f0" : "#f00";
        ctx.fillRect(p.x, p.y, 30, 30);
        ctx.fillStyle = "#fff";
        ctx.fillText(p.name, p.x, p.y - 10);
    }
}
update();
