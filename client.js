const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const nameInput = document.getElementById('nameInput');
const playBtn = document.getElementById('playBtn');
const leaderboard = document.getElementById('leaderboard');
const markerContainer = document.getElementById('progress-wrapper');
const timerEl = document.getElementById('timer');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize; resize();

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let gameStarted = false;
let myId = Math.random().toString(36).substring(7);
let world = { players: {}, platforms: [], timeLeft: 30 };
let me = { x: window.innerWidth / 2, y: 750, w: 35, h: 35, vx: 0, vy: 0, name: "GUEST" };
let camY = me.y;

// Load & Start
const savedName = localStorage.getItem('sprint_name');
if (savedName) nameInput.value = savedName;

playBtn.onclick = () => {
    if (nameInput.value.trim()) {
        me.name = nameInput.value.toUpperCase();
        localStorage.setItem('sprint_name', me.name);
        overlay.style.display = 'none';
        gameStarted = true;
    }
};

// Keyboard Support: Hides buttons on use
let keys = {};
window.addEventListener('keydown', (e) => {
    document.body.classList.add('keyboard-active');
    if(e.code === 'ArrowLeft' || e.key === 'a') keys['Left'] = true;
    if(e.code === 'ArrowRight' || e.key === 'd') keys['Right'] = true;
    if(e.code === 'Space' || e.key === 'w' || e.code === 'ArrowUp') keys['Space'] = true;
});
window.addEventListener('keyup', (e) => {
    if(e.code === 'ArrowLeft' || e.key === 'a') keys['Left'] = false;
    if(e.code === 'ArrowRight' || e.key === 'd') keys['Right'] = false;
    if(e.code === 'Space' || e.key === 'w' || e.code === 'ArrowUp') keys['Space'] = false;
});

// Touch Support
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[k] = true; }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[k] = false; }, {passive: false});
};
bind('lBtn', 'Left'); bind('rBtn', 'Right'); bind('jBtn', 'Space');

socket.onmessage = (e) => {
    world = JSON.parse(e.data);
    updateUI();
};

function updateUI() {
    timerEl.innerText = world.timeLeft.toFixed(1);
    
    // Sort players by height (Y value ascending)
    const sorted = Object.entries(world.players)
        .sort((a, b) => a[1].y - b[1].y);

    // Update Leaderboard
    leaderboard.innerHTML = '<strong>RANKINGS</strong><br>';
    sorted.forEach(([id, p], index) => {
        const div = document.createElement('div');
        div.className = `rank-item ${index === 0 ? 'rank-1' : ''}`;
        div.innerHTML = `<span>${index+1}. ${p.name}</span><span>${Math.abs(Math.round(p.y - 750))}m</span>`;
        leaderboard.appendChild(div);
    });

    // Update Progress Markers
    markerContainer.innerHTML = '';
    sorted.forEach(([id, p]) => {
        const marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.style.background = id === myId ? '#4CAF50' : '#2196F3';
        // Map Y position to 0-100% (Assume race goes to -10000)
        const progress = Math.min(100, Math.max(0, (750 - p.y) / 10750 * 100));
        marker.style.left = progress + '%';
        markerContainer.appendChild(marker);
    });
}

function update() {
    if (!gameStarted) return requestAnimationFrame(update);

    me.vy += 0.8;
    if (keys['Left']) me.vx = -9;
    else if (keys['Right']) me.vx = 9;
    else me.vx *= 0.85;

    me.x += me.vx;
    me.y += me.vy;

    let grounded = false;
    world.platforms.forEach(p => {
        if (me.x < p.x + p.w && me.x + me.w > p.x && me.y < p.y + p.h && me.y + me.h > p.y) {
            if (me.vy > 0 && me.y < p.y + (p.h/2)) {
                me.y = p.y - me.h; me.vy = 0; grounded = true;
            }
        }
    });

    if (grounded && keys['Space']) me.vy = -24; // High jump preserved
    
    // Boundary check
    if (me.x < 0) me.x = 0; if (me.x > canvas.width - me.w) me.x = canvas.width - me.w;
    // Respawn if fall off screen
    if (me.y > camY + canvas.height + 200) { me.y = 750; me.x = canvas.width/2; me.vy = 0; }

    camY += (me.y - (canvas.height * 0.6) - camY) * 0.1;

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

    // Platforms
    ctx.fillStyle = "#2c2c35";
    world.platforms.forEach(p => {
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 5); ctx.fill();
    });

    // Other Players
    for (let id in world.players) {
        let p = world.players[id];
        ctx.fillStyle = id === myId ? "#4CAF50" : "#2196F3";
        ctx.beginPath(); ctx.roundRect(p.x, p.y, me.w, me.h, 10); ctx.fill();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 12);
    }
}
update();
