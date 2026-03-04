export default {
  players: {},
  obstacles: [
    {x: 400, y: 500, w: 150, h: 20},
    {x: 800, y: 400, w: 150, h: 20},
    {x: 1200, y: 300, w: 150, h: 20}
  ],

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      // Start Obstacle Loop if not started
      if (!this.looping) {
        this.looping = true;
        setInterval(() => {
          this.obstacles.forEach(o => {
            o.x -= 4; // Scroll speed
            if (o.x < -200) {
                o.x = 1200; // Reset to right
                o.y = 200 + Math.random() * 300;
            }
          });
        }, 30);
      }

      server.addEventListener('message', (msg) => {
        const data = JSON.parse(msg.data);
        this.players[data.id] = { x: data.x, y: data.y, name: data.name };
        
        server.send(JSON.stringify({
          players: this.players,
          obstacles: this.obstacles
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("OK", { status: 200 });
  }
};
