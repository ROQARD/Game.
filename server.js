export default {
  players: {},
  platforms: [],
  hazards: [],
  goalY: -6000,

  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (this.platforms.length === 0) {
          // Starting Floor (Lowered)
          this.platforms.push({x: -1000, y: 800, w: 3000, h: 100});
          
          // Generate Challenge Levels
          for(let i=1; i<50; i++) {
              let y = 800 - (i * 140);
              // Safe Platforms
              this.platforms.push({ x: Math.random() * 800, y: y, w: 120, h: 20 });
              
              // Add Hazards every few levels
              if(i > 10 && i % 4 === 0) {
                  this.hazards.push({ x: 0, y: y - 50, w: 2000, h: 5 }); // Crossing Lasers
              }
          }
      }

      server.addEventListener('message', (msg) => {
        const d = JSON.parse(msg.data);
        this.players[d.id] = { x: d.x, y: d.y, name: d.name };
        server.send(JSON.stringify({ 
            players: this.players, 
            platforms: this.platforms, 
            hazards: this.hazards,
            goalY: this.goalY 
        }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Co-op Server Online");
  }
};
