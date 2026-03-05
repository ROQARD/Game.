export default {
  players: {},
  platforms: [],
  startTime: Date.now(),
  roundEnded: false,
  winner: null,

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (this.platforms.length === 0) {
          this.platforms.push({x: -1000, y: 800, w: 4000, h: 100});
          for(let i=1; i<250; i++) { // Generated for a full 200m climb
              this.platforms.push({ x: (Math.random() * 800), y: 800 - (i * 160), w: 170, h: 30 });
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        const now = Date.now();
        let elapsed = (now - this.startTime) / 1000;

        // Logic: 30s Race -> 5s Result Screen -> Repeat
        if (!this.roundEnded && elapsed >= 30) {
            this.roundEnded = true;
            // Find Winner
            let top = { name: "Nobody", score: 0 };
            for(let id in this.players) {
                let score = Math.floor(Math.abs(this.players[id].y - 750) / 160);
                if (score > top.score) top = { name: this.players[id].name, score: score };
            }
            this.winner = top;
        }

        if (this.roundEnded && elapsed >= 35) {
            this.roundEnded = false;
            this.startTime = now;
            this.winner = null;
            elapsed = 0;
        }

        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        
        server.send(JSON.stringify({ 
            players: this.players, 
            platforms: this.platforms,
            timeLeft: Math.max(0, 30 - elapsed),
            roundEnded: this.roundEnded,
            winner: this.winner
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("High Performance Sprint Server Active");
  }
};
