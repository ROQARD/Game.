export default {
  players: {},
  obstacles: [
    {x: 0, y: 600, w: 2000, h: 50}, // Floor
    {x: 400, y: 450, w: 200, h: 30},
    {x: 800, y: 350, w: 200, h: 30}
  ],
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      
      // Infinite Obstacle Loop
      if (!this.started) {
        this.started = true;
        setInterval(() => {
          this.obstacles.forEach(o => {
            o.x -= 5; // The "Scroll" speed
            if (o.x + o.w < 0) {
              o.x = 1000 + Math.random() * 500;
              o.y = 200 + Math.random() * 400;
            }
          });
        }, 16);
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        server.send(JSON.stringify({ players: this.players, obstacles: this.obstacles }));
      });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Server Active");
  }
};
