export default {
  players: {},
  obstacles: [],
  
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      // Generate a vertical tower if it doesn't exist
      if (this.obstacles.length === 0) {
          this.obstacles.push({x: 0, y: 500, w: 400, h: 50}); // Base
          for(let i=1; i<100; i++) {
              this.obstacles.push({
                  x: Math.random() * 300,
                  y: 500 - (i * 150),
                  w: 80, h: 15
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
    return new Response("Climber Server Active");
  }
};
