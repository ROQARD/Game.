export default {
  players: {},
  platforms: [],
  switches: [{x: 100, y: -1800, w: 100, h: 20}],
  gateOpen: false,

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (this.platforms.length === 0) {
          this.platforms.push({x: -500, y: 800, w: 2000, h: 100});
          for(let i=1; i<60; i++) {
              this.platforms.push({
                  x: (Math.random() * 800),
                  y: 800 - (i * 160),
                  w: 140, h: 25
              });
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        
        // CHECK SWITCHES
        this.gateOpen = false;
        for (let pid in this.players) {
            let p = this.players[pid];
            this.switches.forEach(s => {
                if (p.x < s.x + s.w && p.x + 35 > s.x && p.y < s.y + s.h && p.y + 35 > s.y) {
                    this.gateOpen = true;
                }
            });
        }

        server.send(JSON.stringify({ 
            players: this.players, 
            platforms: this.platforms,
            switches: this.switches,
            gateOpen: this.gateOpen,
            goalY: -8000 
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Team Brain Active");
  }
};
