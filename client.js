const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const homeOverlay = document.getElementById('homeOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const nameInput = document.getElementById('nameInput');
const playBtn = document.getElementById('playBtn');
const markerContainer = document.getElementById('progress-wrapper');
const timerEl = document.getElementById('timer');
const leaderboard = document.getElementById('leaderboard');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize; resize();

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

let gameStarted = false;
let myId = Math.random().toString(36).substring(7);
let world = { players: {}, platforms: [], timeLeft: 30, roundEnded: false, winner: null };
let me = { x: window.innerWidth / 2, y: 750, w: 38, h: 38, vx: 0, vy: 0, name: "GUEST" };
let camY = me.y;

// Initialization
const savedName = localStorage.getItem('sprint_name');
if (savedName) nameInput.value = savedName;

playBtn.onclick = () => {
    if (nameInput.value.trim()) {
        me.name = nameInput.value.toUpperCase();
        localStorage.setItem('sprint_name', me.name);
        homeOverlay.style.display = 'none';
        gameStarted = true;
    }
};

// Controls Logic
let keys = {};
window.addEventListener('keydown', (e) => {
    document.getElementById('gameBody').classList.add('kb-active');
    if (e.key === 'ArrowLeft' || e.key === 'a') keys['Left'] = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys['Right'] = true;
    if (e.key === 'Space' || e.key === 'w' || e.key === 'ArrowUp') keys['Space'] = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys['Left'] = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys['Right'] = false;
    if (e.key === 'Space' || e.key === 'w' || e.key === 'ArrowUp') keys['Space'] = false;
});

const bind = (id, k) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[k] = true; }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[k] = false; }, {passive: false});
};
bind('lBtn', 'Left'); bind('rBtn', 'Right'); bind('jBtn', 'Space');

socket.onmessage = (e) => {
    const oldRoundState = world.roundEnded;
    world = JSON.parse(e.data);
    
    // Check for Round Reset
    if (oldRoundState && !world.roundEnded) {
        resultOverlay.style.display = 'none';
        me.y = 750; me.vy = 0;
    }
    
    // Check for Round End
    if (!oldRoundState && world.roundEnded && world.winner) {
        document.getElementById('winnerName').innerText = world.winner.name;
        document.getElementById('winnerScore').innerText = `${world.winner.score}m Climbed!`;
        resultOverlay.style.display = 'flex';
    }

    updateUI();
};

function updateUI() {
    timerEl.innerText = world.timeLeft.toFixed(1);
    
    const sorted = Object.entries(world.players)
        .map(([id, p]) => ({ id, ...p, score: Math.floor(Math.abs(p.y - 750) / 160) }))
        .sort((a, b) => b.score - a.score);

    leaderboard.innerHTML = '<strong>LEADERBOARD</strong><br><br>';
    sorted.slice(0, 5).forEach((p, i) => {
        leaderboard.innerHTML += `<div class="rank-item ${i===0?'rank-1':''}">
            <span>${i+1}. ${p.name}</span><span>${p.score}m</span>
        </div>`;
    });

    markerContainer.innerHTML = '';
    sorted.forEach(p => {
        const marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.style.background = p.id === myId ? '#4CAF50' : '#2196F3';
        // 200m Target for the Progress Bar
        const progress = Math.min(100, Math.max(0, (p.score / 200) * 100));
        marker.style.left = progress + '%';
        markerContainer.appendChild(marker);
    });
}

function update() {
    if (!gameStarted || world.roundEnded) return requestAnimationFrame(update);

    me.vy += 0.85;
    if (keys['Left']) me.vx = -10;
    else if (keys['Right']) me.vx = 10;
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

    if (grounded && keys['Space']) me.vy = -25; // Perfect 2-platform jump
    
    if (me.x < 0) me.x = 0; if (me.x > canvas.width - me.w) me.x = canvas.width - me.w;
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
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0, -camY);

    ctx.fillStyle = "#1a1a24";
    world.platforms.forEach(p => {
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill();
        ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.stroke();
    });

    for (let id in world.players) {
        let p = world.players[id];
        ctx.fillStyle = id === myId ? "#4CAF50" : "#2196F3";
        ctx.beginPath(); ctx.roundRect(p.x, p.y, me.w, me.h, 12); ctx.fill();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "800 16px system-ui";
        ctx.fillText(p.name, p.x + (me.w/2), p.y - 12);
    }
}
update();
