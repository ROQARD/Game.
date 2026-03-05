export default {
  players: {},
  platforms: [],
  startTime: Date.now(),

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      // Generate Level
      if (this.platforms.length === 0) {
          this.platforms.push({x: -1000, y: 800, w: 4000, h: 100});
          for(let i=1; i<150; i++) {
              this.platforms.push({ x: (Math.random() * 800), y: 800 - (i * 160), w: 160, h: 30 });
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        
        // Handle Race Restart every 30 seconds
        let elapsed = (Date.now() - this.startTime) / 1000;
        if (elapsed >= 30) {
            this.startTime = Date.now();
            elapsed = 0;
            // Note: Clients handle their own Y reset when timer resets or they fall
        }

        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        
        server.send(JSON.stringify({ 
            players: this.players, 
            platforms: this.platforms,
            timeLeft: 30 - elapsed
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Race Server Active");
  }
};
