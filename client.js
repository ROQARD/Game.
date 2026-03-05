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
let world = { players: {}, platforms: [], hazards: [], goalY: -5000 };
let me = { x: window.innerWidth / 2, y: 700, w: 30, h: 30, vx: 0, vy: 0, name: "" };
let camY = me.y;

// Auto-load name
const savedName = localStorage.getItem('climber_name');
if (savedName) nameInput.value = savedName;

nameInput.onkeydown = (e) => {
    if (e.key === 'Enter' && nameInput.value.trim()) {
        me.name = nameInput.value.toUpperCase();
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
    // Update progress bar based on highest player vs goalY
    let highest = 800;
    for(let id in world.players) if(world.players[id].y < highest) highest = world.players[id].y;
    const progress = Math.min(100, Math.max(0, (800 - highest) / (800 - world.goalY) * 100));
    progressBar.style.width = progress + "%";
};

function update() {
    if (!gameStarted) return requestAnimationFrame(update);

    me.vy += 0.7; 
    if (keys['Left']) me.vx = -6;
    else if (keys['Right']) me.vx = 6;
    else me.vx *= 0.85;

    me.x += me.vx;
    me.y += me.vy;

    // Collision Logic
    let grounded = false;
    world.platforms.forEach(p => {
        if (me.x < p.x + p.w && me.x + me.w > p.x && me.y < p.y + p.h && me.y + me.h > p.y) {
            if (me.vy > 0 && me.y < p.y + (p.h/2)) {
                me.y = p.y - me.h; me.vy = 0; grounded = true;
            }
        }
    });

    // Hazard Logic (Lasers/Spikes)
    world.hazards.forEach(h => {
        if (me.x < h.x + h.w && me.x + me.w > h.x && me.y < h.y + h.h && me.y + me.h > h.y) {
            me.y = 700; me.x = window.innerWidth / 2; me.vy = 0; // Reset on hit
        }
    });

    if (grounded && keys['Space']) me.vy = -17;
    
    // Follow Camera
    camY += (me.y - (canvas.height * 0.6) - camY) * 0.1;

    if (socket.readyState === 1) {
        socket.send(JSON.stringify({ id: myId, x: me.x, y: me.y, name: me.name }));
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0, -camY);

    // Draw Goal Portal
    ctx.fillStyle = '#0f0';
    ctx.shadowBlur = 20; ctx.shadowColor = '#0f0';
    ctx.fillRect(0, world.goalY, canvas.width, 100);
    ctx.shadowBlur = 0;

    // Draw Platforms
    ctx.fillStyle = "#222";
    world.platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = "#444";
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Draw Hazards (Red Lasers)
    ctx.fillStyle = "#f00";
    world.hazards.forEach(h => ctx.fillRect(h.x, h.y, h.w, h.h));

    // Draw Players
    for (let id in world.players) {
        let p = world.players[id];
        ctx.fillStyle = id === myId ? "#0f0" : "#fff";
        ctx.fillRect(p.x, p.y, me.w, me.h);
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 10);
    }
}
update();
