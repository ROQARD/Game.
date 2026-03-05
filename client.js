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
let world = { players: {}, platforms: [], hazards: [], switches: [], gateOpen: false, goalY: -8000 };
let me = { x: window.innerWidth / 2, y: 700, w: 35, h: 35, vx: 0, vy: 0, name: "" };
let camY = me.y;

// Auto-load name
const savedName = localStorage.getItem('climber_name');
if (savedName) nameInput.value = savedName;

nameInput.onkeydown = (e) => {
    if (e.key === 'Enter' && nameInput.value.trim()) {
        me.name = nameInput.value;
        localStorage.setItem('climber_name', me.name);
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
    let highest = 800;
    for(let id in world.players) if(world.players[id].y < highest) highest = world.players[id].y;
    const progress = Math.min(100, Math.max(0, (800 - highest) / (800 - world.goalY) * 100));
    progressBar.style.width = progress + "%";
};

function update() {
    if (!gameStarted) return requestAnimationFrame(update);

    me.vy += 0.8; 
    if (keys['Left']) me.vx = -8;
    else if (keys['Right']) me.vx = 8;
    else me.vx *= 0.85;

    me.x += me.vx;
    me.y += me.vy;

    let grounded = false;
    // Platform and Gate Collision
    const collidables = [...world.platforms];
    if (!world.gateOpen) {
        collidables.push({x: 0, y: -2000, w: canvas.width, h: 40, type: 'gate'});
    }

    collidables.forEach(p => {
        if (me.x < p.x + p.w && me.x + me.w > p.x && me.y < p.y + p.h && me.y + me.h > p.y) {
            if (me.vy > 0 && me.y < p.y + (p.h/2)) {
                me.y = p.y - me.h; me.vy = 0; grounded = true;
            }
        }
    });

    if (grounded && keys['Space']) me.vy = -20; // HIGHER JUMP to "get there"
    
    // Death reset
    if (me.y > camY + canvas.height) { me.y = 700; me.x = canvas.width/2; me.vy = 0; }

    camY += (me.y - (canvas.height * 0.5) - camY) * 0.1;

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0, -camY);

    // Draw Switches (Yellow)
    world.switches.forEach(s => {
        ctx.fillStyle = world.gateOpen ? '#4CAF50' : '#FFD700';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "white";
        ctx.fillText("TEAM SWITCH", s.x, s.y - 10);
    });

    // Draw Gate (Only if closed)
    if (!world.gateOpen) {
        ctx.fillStyle = '#f44336';
        ctx.fillRect(0, -2000, canvas.width, 40);
        ctx.fillText("WAIT FOR TEAMMATE ON SWITCH!", canvas.width/2 - 100, -2015);
    }

    // Platforms
    ctx.fillStyle = "#333344";
    world.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Players
    for (let id in world.players) {
        let p = world.players[id];
        ctx.fillStyle = id === myId ? "#4CAF50" : "#2196F3";
        ctx.beginPath(); ctx.roundRect(p.x, p.y, me.w, me.h, 8); ctx.fill();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 16px system-ui";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 10);
    }
}
update();
