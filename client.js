const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const nameInput = document.getElementById('nameInput');
const progressBar = document.getElementById('progress-bar');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let gameStarted = false;
let myId = Math.random().toString(36).substring(7);
let world = { players: {}, platforms: [], switches: [], gateOpen: false, goalY: -10000 };
let me = { x: window.innerWidth / 2, y: 750, w: 38, h: 38, vx: 0, vy: 0, name: "" };
let camY = me.y;

// Load Name
const savedName = localStorage.getItem('zenith_name');
if (savedName) nameInput.value = savedName;

nameInput.onkeydown = (e) => {
    if (e.key === 'Enter' && nameInput.value.trim()) {
        me.name = nameInput.value;
        localStorage.setItem('zenith_name', me.name);
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
    world = JSON.parse(e.data);
    let highestY = 800;
    for(let id in world.players) if(world.players[id].y < highestY) highestY = world.players[id].y;
    const progress = Math.min(100, Math.max(0, (800 - highestY) / (800 - world.goalY) * 100));
    progressBar.style.width = progress + "%";
};

function update() {
    if (!gameStarted) return requestAnimationFrame(update);

    me.vy += 0.8; // Normal Gravity
    if (keys['Left']) me.vx = -9;
    else if (keys['Right']) me.vx = 9;
    else me.vx *= 0.85;

    me.x += me.vx;
    me.y += me.vy;

    let grounded = false;
    const collidables = [...world.platforms];
    if (!world.gateOpen) collidables.push({x: 0, y: -2500, w: canvas.width, h: 50});

    collidables.forEach(p => {
        if (me.x < p.x + p.w && me.x + me.w > p.x && me.y < p.y + p.h && me.y + me.h > p.y) {
            if (me.vy > 0 && me.y < p.y + (p.h/2)) {
                me.y = p.y - me.h; me.vy = 0; grounded = true;
            }
        }
    });

    if (grounded && keys['Space']) me.vy = -24; // MEGA JUMP: Clears 2 platforms
    
    if (me.y > camY + canvas.height + 200) { me.y = 750; me.x = canvas.width/2; me.vy = 0; }
    if (me.x < 0) me.x = 0; if (me.x > canvas.width - me.w) me.x = canvas.width - me.w;

    camY += (me.y - (canvas.height * 0.55) - camY) * 0.1;

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0, -camY);

    // Switches
    world.switches.forEach(s => {
        ctx.fillStyle = world.gateOpen ? '#4CAF50' : '#FFC107';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("TEAM SENSOR", s.x + 10, s.y - 10);
    });

    // Gate
    if (!world.gateOpen) {
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(0, -2500, canvas.width, 50);
        ctx.fillStyle = "white";
        ctx.fillText("GATE LOCKED: NEED PLAYER ON SENSOR", canvas.width/2 - 100, -2515);
    }

    // Platforms
    ctx.fillStyle = "#2c2c35";
    world.platforms.forEach(p => {
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 5); ctx.fill();
    });

    // Players
    for (let id in world.players) {
        let p = world.players[id];
        ctx.fillStyle = id === myId ? "#4CAF50" : "#2196F3";
        ctx.beginPath(); ctx.roundRect(p.x, p.y, me.w, me.h, 10); ctx.fill();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "700 16px system-ui";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 12);
    }
}
update();
