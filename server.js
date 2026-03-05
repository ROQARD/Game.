export default {
  players: {},
  platforms: [],
  switches: [{x: 150, y: -2200, w: 120, h: 20}],
  gateOpen: false,

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (this.platforms.length === 0) {
          this.platforms.push({x: -1000, y: 800, w: 4000, h: 100}); // Big Floor
          for(let i=1; i<100; i++) {
              this.platforms.push({
                  x: (Math.random() * 800),
                  y: 800 - (i * 160), // Spaced for the double-platform jump
                  w: 150, h: 30
              });
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        
        this.gateOpen = false;
        for (let pid in this.players) {
            let p = this.players[pid];
            this.switches.forEach(s => {
                if (p.x < s.x + s.w && p.x + 38 > s.x && p.y < s.y + s.h && p.y + 38 > s.y) {
                    this.gateOpen = true;
                }
            });
        }

        server.send(JSON.stringify({ 
            players: this.players, 
            platforms: this.platforms,
            switches: this.switches,
            gateOpen: this.gateOpen,
            goalY: -10000 
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Server Active");
  }
};
