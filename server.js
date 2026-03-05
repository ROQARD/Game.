export default {
  players: {},
  obstacles: [
    {x: 0, y: 500, w: 1000, h: 50}, // Starting floor
    {x: 1200, y: 400, w: 100, h: 20},
    {x: 1500, y: 300, w: 100, h: 20}
  ],
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      
      if (!this.init) {
        this.init = true;
        setInterval(() => {
          this.obstacles.forEach(o => {
            o.x -= 6; // Fast scrolling
            if (o.x + o.w < -100) {
              o.x = 1200 + Math.random() * 400;
              o.y = 200 + Math.random() * 400;
              o.w = 50 + Math.random() * 100; // Random widths
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
    return new Response("Game Server Running");
  }
};
