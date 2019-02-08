/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import { expect } from 'chai';
import { MockStateStore as store } from '../helpers';
import {
	OutTransferTransaction,
} from '../../src/transactions';
import { validOutTransferTransactions } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';

describe('outTransfer transaction class', () => {
	const defaultTransaction = validOutTransferTransactions[0];
	const defaultValidSender = {
		address: '13155556493249255133L',
		balance: '500010000000',
		publicKey:
			'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
	};

	let validTestTransaction: OutTransferTransaction;

	beforeEach(async () => {
		validTestTransaction = new OutTransferTransaction(defaultTransaction);
		store.account.get = () => defaultValidSender;		
	});

	describe('#constructor', () => {
		it('should create instance of OutTransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(OutTransferTransaction);
		});

		it('should set the outTransfer asset', async () => {
			expect(validTestTransaction.asset.outTransfer).to.be.an('object');
			expect(validTestTransaction.asset.outTransfer.dappId).to.equal(
				defaultTransaction.asset.outTransfer.dappId,
			);
			expect(validTestTransaction.asset.outTransfer.transactionId).to.equal(
				defaultTransaction.asset.outTransfer.transactionId,
			);
		});

		it('should throw TransactionMultiError when asset.dappId is not string', async () => {
			const invalidOutTransferTransactionData = {
				...defaultTransaction,
				asset: {
					outTransfer: {
						dappId: 1,
						transactionId: '1',
					},
				},
			};
			expect(
				() => new OutTransferTransaction(invalidOutTransferTransactionData),
			).to.throw('Invalid field types');
		});

		it('should throw TransactionMultiError when asset.transactionId is not string', async () => {
			const invalidOutTransferTransactionData = {
				...defaultTransaction,
				asset: {
					outTransfer: {
						dappId: '1',
						transactionId: 1,
					},
				},
			};
			expect(
				() => new OutTransferTransaction(invalidOutTransferTransactionData),
			).to.throw('Invalid field types');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.concat([
					Buffer.from(defaultTransaction.asset.outTransfer.dappId, 'utf8'),
					Buffer.from(
						defaultTransaction.asset.outTransfer.transactionId,
						'utf8',
					),
				]),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validOutTransferTransactions[1],
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with errors when it has conflicting asset transaction id', async () => {
			const invalidTransaction = {
				...validOutTransferTransactions[1],
				asset: {
					outTransfer: {
						dappId: validOutTransferTransactions[1].asset.outTransfer.dappId,
						transactionId: defaultTransaction.asset.outTransfer.transactionId,
					},
				},
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				invalidTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(status).to.equal(Status.FAIL);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(errors[0].dataPath).to.equal('.asset.outTransfer.transactionId');
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).to.be.empty;		
		});

		it('should return error when asset includes non id format dappId', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '16003217217288827597',
				asset: {
					outTransfer: {
						dappId: 'id-not-id-format-zzzzz',
						transactionId: '17748758437863626387',
					},
				},
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.outTransfer.dappId');
		});

		it('should return error when asset includes non id format transaction id', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '14791901133590540608',
				asset: {
					outTransfer: {
						dappId: '17748758437863626387',
						transactionId: 'id-not-id-format-zzzzz',
					},
				},
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset()
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.outTransfer.transactionId');
		});

		it('should return error when recipientId is empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				recipientId: '',
				id: '13921832040819226757',
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientId');
		});

		it('should return error when amount is zero', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '16972514353304288599',
				amount: '0',
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.amount');
		});
	});
});
