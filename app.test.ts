import {
    Machine,
    MachineRefillEvent,
    MachineSaleEvent,
    MachineSaleSubscriber,
    MachineRefillSubscriber,
    MachinePublishSubscribeService,
    EventType
} from "./app.ts";

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


describe('MachineSubscriber', () => {
    test('Should be able to create a MachineSaleSubscriber', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const soldAmount = 3;
        const testSaleSubscriber = new MachineSaleSubscriber(machines);
        const testSaleEvent = new MachineSaleEvent(soldAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)

        testSaleSubscriber.handle(testSaleEvent);

        expect(test_machine.stockLevel).toEqual(10 - soldAmount)
    });

    test('MachineSaleSubscriber should not make stockLevel go negative', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const exceededSoldAmount = 20;
        const testSaleSubscriber = new MachineSaleSubscriber(machines);
        const testSaleEvent = new MachineSaleEvent(exceededSoldAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)

        testSaleSubscriber.handle(testSaleEvent);

        expect(test_machine.stockLevel).toEqual(0)
    });

    test('Should be able to create a MachineRefillSubscriber', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const refillAmount = 5;
        const testRefillSubscriber = new MachineRefillSubscriber(machines);
        const testRefillEvent = new MachineRefillEvent(refillAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)

        testRefillSubscriber.handle(testRefillEvent);

        expect(test_machine.stockLevel).toEqual(10 + refillAmount)
    });

    test('MachineSaleSubscriber should fail to handle non-MachineSaleEvent', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const soldAmount = 3;
        const testRefillSubscriber = new MachineRefillSubscriber(machines);

        const testSaleEvent = new MachineSaleEvent(soldAmount, test_machine.id)

        expect(() => {
            testRefillSubscriber.handle(testSaleEvent)
        }).toThrow(TypeError)
    });
});

describe('MachinePublishSubscribeService', () => {
    test('Should be able to subscribe different types of subscribers', () => {
        const machines = [new Machine('002'), new Machine('003')];
        const saleSubscriber1 = new MachineSaleSubscriber(machines);
        const saleSubscriber2 = new MachineSaleSubscriber(machines);
        const refillSubscriber = new MachineRefillSubscriber(machines);
        const pubSubService = new MachinePublishSubscribeService();

        expect(pubSubService.getSubscriberCount()).toEqual(0)

        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)

        expect(pubSubService.getSubscriberCount()).toEqual(3)
    });

    test('Should be able to publish MachineSaleEvent to subscribers', () => {
        const testMachine1 = new Machine('001')
        const testMachine2 = new Machine('002')
        const machines = [testMachine1, new Machine('002')];
        const saleSubscriber1 = new MachineSaleSubscriber(machines);
        const saleSubscriber2 = new MachineSaleSubscriber(machines);
        const refillSubscriber = new MachineRefillSubscriber(machines);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)

        const testSaleQty = 3;
        const testSaleEvents = new MachineSaleEvent(testSaleQty, testMachine1.id);

        expect(testMachine1.stockLevel).toEqual(10);
        expect(testMachine2.stockLevel).toEqual(10);

        pubSubService.publish(testSaleEvents);

        expect(testMachine1.stockLevel).toEqual(10 - testSaleQty * 2);
        expect(testMachine2.stockLevel).toEqual(10);
    });

    test('Should be able to publish MachineRefill to subscribers', () => {
        const testMachine1 = new Machine('001')
        const testMachine2 = new Machine('002')
        const machines = [testMachine1, new Machine('002')];
        const saleSubscriber1 = new MachineSaleSubscriber(machines);
        const saleSubscriber2 = new MachineSaleSubscriber(machines);
        const refillSubscriber1 = new MachineRefillSubscriber(machines);
        const refillSubscriber2 = new MachineRefillSubscriber(machines);
        const refillSubscriber3 = new MachineRefillSubscriber(machines);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber1)
        pubSubService.subscribe(EventType.Refill, refillSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber3)

        const testRefillQty = 4;
        const testRefillEvent = new MachineRefillEvent(testRefillQty, testMachine1.id);

        expect(testMachine1.stockLevel).toEqual(10);
        expect(testMachine2.stockLevel).toEqual(10);

        pubSubService.publish(testRefillEvent);

        expect(testMachine1.stockLevel).toEqual(10 + testRefillQty * 3);
        expect(testMachine2.stockLevel).toEqual(10);
    });

    test('The subscribers should be working off a shared array of Machine objects, mutating them depending on the event received.', () => {
        const testMachine1 = new Machine('001')
        const testMachine2 = new Machine('002')
        const machines = [testMachine1, new Machine('002')];
        const saleSubscriber = new MachineSaleSubscriber(machines);
        const refillSubscriber = new MachineRefillSubscriber(machines);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)

        const testRefillQty = 4;
        const testSaleEvents = new MachineRefillEvent(testRefillQty, testMachine1.id);

        const testSaleQty = 3;
        const testRefillEvent = new MachineSaleEvent(testSaleQty, testMachine1.id);

        expect(testMachine1.stockLevel).toEqual(10);
        expect(testMachine2.stockLevel).toEqual(10);

        pubSubService.publish(testSaleEvents);
        pubSubService.publish(testRefillEvent);

        expect(testMachine1.stockLevel).toEqual(10 + testRefillQty - testSaleQty);
        expect(testMachine2.stockLevel).toEqual(10);
    });
});
