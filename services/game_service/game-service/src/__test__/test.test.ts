import { sum } from '../app';

afterAll(async () => {
	await new Promise(resolve => setTimeout(resolve, 1));
});

test('adds 1 + 2 to equal 3', () => {
	expect(sum(1, 2)).toBe(3);
});

