export default {
  players: {},
  obstacles: [],
  
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (this.obstacles.length === 0) {
          // Wider base floor for fullscreen
          this.obstacles.push({x: -500, y: 600, w: 3000, h: 50}); 
          for(let i=1; i<300; i++) {
              this.obstacles.push({
                  x: (Math.random() * 2000) - 500, // Spread platforms out
                  y: 600 - (i * 150),
                  w: 120, h: 20
              });
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        server.send(JSON.stringify({ players: this.players, obstacles: this.obstacles }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Wide Server Active");
  }
};
