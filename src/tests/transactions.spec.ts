import { execSync } from 'node:child_process';
import { it, expect, beforeAll, afterAll, beforeEach,describe } from 'vitest';
import request from 'supertest';

import { app } from '../app';

describe('Transactions routes - END-TO-END TEST', () => {
	beforeAll(async () => {
		await app.ready();
	});
	
	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		execSync('npm run knex migrate:rollback --all');
		execSync('npm run knex migrate:latest');
	});
	
	it('should be able to create a new transaction', async () => {
		const response = await request(app.server)
			.post('/transactions')
			.send({
				title: 'New transaction',
				amount: 5000,
				type: 'credit',
			});
		
		expect(response.statusCode).toEqual(201);
	});

	it('should be able to list all transactions', async () => {
		const createTransactionResponse = await request(app.server)
			.post('/transactions')
			.send({
				title: 'New transaction',
				amount: 5000,
				type: 'credit',
			});

		const cookies = createTransactionResponse.get('Set-Cookie');

		const listTransactionsResponse = await request(app.server)
			.get('/transactions')
			.set('Cookie', cookies);
		
		expect(listTransactionsResponse.statusCode).toEqual(200);
		expect(listTransactionsResponse.body.transactions).toEqual([
			expect.objectContaining({
				title: 'New transaction',
				amount: 5000,
			}),
		]);
	});

	it('should be able to get a specific transaction', async () => {
		const createTransactionResponse = await request(app.server)
			.post('/transactions')
			.send({
				title: 'New transaction',
				amount: 5000,
				type: 'credit',
			});

		const cookies = createTransactionResponse.get('Set-Cookie');

		const listTransactionsResponse = await request(app.server)
			.get('/transactions')
			.set('Cookie', cookies);
		
		const idTransaction = 
			listTransactionsResponse.body.transactions[0].id;
		
		const getTransactionResponse = await request(app.server)
			.get(`/transactions/${idTransaction}`)
			.set('Cookie', cookies);
		
		expect(getTransactionResponse.statusCode).toEqual(200);
		expect(getTransactionResponse.body.transaction).toEqual(
			expect.objectContaining({
				title: 'New transaction',
				amount: 5000,
			}),
		);
	});

	it.only('should be able to list all transactions', async () => {
		const createCreditTransactionResponse = await request(app.server)
			.post('/transactions')
			.send({
				title: 'Credit transaction',
				amount: 5000,
				type: 'credit',
			});

		const cookies = createCreditTransactionResponse.get('Set-Cookie');

		await request(app.server)
			.post('/transactions')
			.set('Cookie', cookies)
			.send({
				title: 'Debit transaction',
				amount: 3000,
				type: 'debit',
			});

		const summaryTransactionsResponse = await request(app.server)
			.get('/transactions/summary')
			.set('Cookie', cookies);
		
		expect(summaryTransactionsResponse.statusCode).toEqual(200);
		expect(summaryTransactionsResponse.body.summary).toEqual({
			amount: 2000,
		});
	});
});