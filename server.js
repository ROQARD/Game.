export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    await this.handleSession(server);

    return new Response(null, { status: 101, webSocket: client });
  },

  players: {},

  async handleSession(server) {
    server.accept();
    server.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      this.players[data.id] = { x: data.x, y: data.y };
      
      // Broadcast to all (Simplified for this demo)
      server.send(JSON.stringify(this.players));
    });
  }
};
