import {Machine} from "./app.ts";

describe('Machine', () => {
    test('Should be able to create a machine with proper param', () => {
        const m1 = new Machine('001')
        expect(m1.stockLevel).toEqual(10)
        expect(m1.id).toEqual('001')
    });
});
