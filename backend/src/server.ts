// src/server.js
import fastify, { FastifyRequest, FastifyReply } from 'fastify';

const server = fastify({ logger: true });

const PORT = process.env.PORT || 5000;

server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Backend server is running!' };
});

const start = async () => {
  try {
    await server.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`Backend server is running on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();