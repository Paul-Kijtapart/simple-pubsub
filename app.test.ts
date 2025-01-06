import {Machine, MachineRefillEvent, MachineSaleEvent} from "./app.ts";

describe('Machine', () => {
    test('Should be able to create a machine with proper param', () => {
        const m1 = new Machine('001')
        expect(m1.stockLevel).toEqual(10)
        expect(m1.id).toEqual('001')
    });
});


describe('MachineEvent', () => {
    test('Should be able to create a MachineSaleEvent', () => {
        const testSoleQuantity = 3;
        const testMachineId = '001';

        const ms = new MachineSaleEvent(testSoleQuantity, testMachineId);

        expect(ms.getSoldQuantity()).toEqual(testSoleQuantity)
        expect(ms.machineId()).toEqual(testMachineId)
    });

    test('Should be able to create a MachineRefillEvent', () => {
        const testRefillQuanity = 5;
        const testMachineId = '002';

        const mr = new MachineRefillEvent(testRefillQuanity, testMachineId);

        expect(mr.getRefillQuantity()).toEqual(testRefillQuanity)
        expect(mr.machineId()).toEqual(testMachineId)
    });
});

