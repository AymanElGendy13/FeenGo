import { connect, createServer, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';

/** A local port that nothing listens on: connections to it are refused at once. */
export async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

/** A server that accepts connections and never answers, like a dependency that hangs. */
export async function silentServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    close: async () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/**
 * A TCP relay to a real service, such as the Compose Redis. `close` cuts every
 * connection through it and stops listening, as if the service went away; `open`
 * listens on the same port again. The service itself is never touched.
 */
export async function tcpRelay(
  host: string,
  port: number,
): Promise<{ port: number; close: () => Promise<void>; open: () => Promise<void> }> {
  const sockets = new Set<Socket>();
  const server = createServer((client) => {
    const upstream = connect(port, host);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on('error', () => socket.destroy());
      socket.on('close', () => {
        sockets.delete(socket);
        client.destroy();
        upstream.destroy();
      });
    }
    client.pipe(upstream);
    upstream.pipe(client);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port: relayPort } = server.address() as AddressInfo;
  return {
    port: relayPort,
    close: async () => {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      for (const socket of sockets) {
        socket.destroy();
      }
      await closed;
    },
    open: () => new Promise<void>((resolve) => server.listen(relayPort, '127.0.0.1', resolve)),
  };
}
