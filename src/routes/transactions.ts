import { randomUUID } from 'crypto';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { knex } from '../database';
import { checkSessionIdExists } from '../middlewares/check-session-id-exists';

export async function transactions(server: FastifyInstance) {
	server.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
		console.log(`${req.method} - ${req.url}`);
	});

	server.get('/', {
		preHandler: [checkSessionIdExists]
	}, async (req: FastifyRequest) => {
		const { sessionId } = req.cookies;

		const transactions = await knex('transactions')
			.where('session_id', sessionId)
			.select();

		return { transactions };
	});

	server.get('/:id', {
		preHandler: [checkSessionIdExists]
	}, async (req: FastifyRequest) => {
		const transactionSchema = z.object({
			id: z.string().uuid(),
		});

		const { sessionId } = req.cookies;
		const { id } = transactionSchema.parse(req.params);

		const transaction = await knex('transactions')
			.where({ id, session_id: sessionId })
			.first();

		return { transaction };
	});

	server.get('/summary', {
		preHandler: [checkSessionIdExists]
	}, async (req: FastifyRequest) => {
		const { sessionId } = req.cookies;

		const summary = await knex('transactions')
			.where('session_id', sessionId)
			.sum('amount', { as: 'amount' })
			.first();

		return { summary };
	});

	server.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
		const transactionSchema = z.object({
			title: z.string(),
			amount: z.number(),
			type: z.enum(['debit', 'credit']),
		});

		const { title, amount, type } = transactionSchema.parse(req.body);

		let sessionId = req.cookies.sessionId;

		if (!sessionId) {
			sessionId = randomUUID();

			reply.cookie('sessionId', sessionId, {
				path: '/', // Can be accessed by all routes
				maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
			});
		}

		await knex('transactions').insert({
			id: randomUUID(),
			title,
			amount: type === 'credit' ? amount : amount * -1,
			session_id: sessionId,
		});

		return reply.status(201).send();
	});
}