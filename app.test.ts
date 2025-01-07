import {
    EventType,
    StockLevel,
    Machine,
    MachinePublishSubscribeService,
    MachineRefillEvent,
    MachineLowStockWarningEvent,
    MachineStockLevelOkEvent,
    MachineRefillSubscriber,
    MachineSaleEvent,
    MachineSaleSubscriber
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

    test('Should be able to create a MachineLowStockWarningEvent', () => {
        const testMachineId = '002';

        const mr = new MachineLowStockWarningEvent(testMachineId);

        expect(mr.type()).toEqual(EventType.Low)
        expect(mr.machineId()).toEqual(testMachineId)
    });

    test('Should be able to create a MachineStockLevelOkEvent', () => {
        const testMachineId = '002';

        const mr = new MachineStockLevelOkEvent(testMachineId);

        expect(mr.type()).toEqual(EventType.Ok)
        expect(mr.machineId()).toEqual(testMachineId)
    });
});

describe('MachineSubscriber', () => {
    test('Should be able to create a MachineSaleSubscriber', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const soldAmount = 3;
        const testSaleSubscriber = new MachineSaleSubscriber(machines, []);
        const testSaleEvent = new MachineSaleEvent(soldAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)

        testSaleSubscriber.handle(testSaleEvent);

        expect(test_machine.stockLevel).toEqual(10 - soldAmount)
    });

    test('Should generate MachineLowStockWarningEvent when stockLevel drops below Ok level just once', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const soldAmount = 7;
        const warningEvents = [];
        const testSaleSubscriber = new MachineSaleSubscriber(machines, warningEvents);
        const testSaleEvent = new MachineSaleEvent(soldAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)
        expect(warningEvents.length).toEqual(0);

        testSaleSubscriber.handle(testSaleEvent);

        expect(test_machine.stockLevel).toEqual(StockLevel.Ok)
        expect(warningEvents.length).toEqual(0);

        const testSaleEvent2 = new MachineSaleEvent(1, test_machine.id)
        testSaleSubscriber.handle(testSaleEvent2);

        expect(warningEvents.length).toEqual(1);

        const testSaleEvent3 = new MachineSaleEvent(1, test_machine.id)
        testSaleSubscriber.handle(testSaleEvent3);

        expect(warningEvents.length).toEqual(1);
    });

    test('MachineSaleSubscriber should not make stockLevel go negative', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const exceededSoldAmount = 20;
        const warningEvents = [];
        const testSaleSubscriber = new MachineSaleSubscriber(machines, warningEvents);
        const testSaleEvent = new MachineSaleEvent(exceededSoldAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)
        expect(warningEvents.length).toEqual(0);

        testSaleSubscriber.handle(testSaleEvent);

        expect(warningEvents.length).toEqual(1);
        expect(test_machine.stockLevel).toEqual(0)
    });

    test('Should be able to create a MachineRefillSubscriber', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const refillAmount = 5;
        const testRefillSubscriber = new MachineRefillSubscriber(machines, []);
        const testRefillEvent = new MachineRefillEvent(refillAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(10)

        testRefillSubscriber.handle(testRefillEvent);

        expect(test_machine.stockLevel).toEqual(10 + refillAmount)
    });

    test('MachineRefillSubscriber should generate MachineStockLevelOkEvent when pass Ok threshold just once', () => {
        const testStockLevel = StockLevel.Ok - 1;
        const test_machine = new Machine('001', testStockLevel)
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const refillAmount = 5;
        const warningEvents = [];
        const testRefillSubscriber = new MachineRefillSubscriber(machines, warningEvents);
        const testRefillEvent = new MachineRefillEvent(refillAmount, test_machine.id)

        expect(test_machine.stockLevel).toEqual(testStockLevel)
        expect(warningEvents.length).toEqual(0);

        testRefillSubscriber.handle(testRefillEvent);

        expect(warningEvents.length).toEqual(1);
        expect(test_machine.stockLevel).toEqual(testStockLevel + refillAmount)
    });

    test('MachineSaleSubscriber should fail to handle non-MachineSaleEvent', () => {
        const test_machine = new Machine('001')
        const machines: Machine[] = [test_machine, new Machine('002'), new Machine('003')];
        const soldAmount = 3;
        const testRefillSubscriber = new MachineRefillSubscriber(machines, []);

        const testSaleEvent = new MachineSaleEvent(soldAmount, test_machine.id)

        expect(() => {
            // @ts-ignore
            testRefillSubscriber.handle(testSaleEvent)
        }).toThrow(TypeError)
    });
});

describe('MachinePublishSubscribeService', () => {
    test('Should be able to subscribe/unsubscribe different types of subscribers', () => {
        const machines = [new Machine('002'), new Machine('003')];
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machines, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machines, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machines, warningEvents);
        const refillSubscriber2 = new MachineRefillSubscriber(machines, warningEvents);
        const pubSubService = new MachinePublishSubscribeService();

        expect(pubSubService.getSubscriberCount()).toEqual(0)

        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)
        pubSubService.subscribe(EventType.Refill, refillSubscriber2)

        expect(pubSubService.getSubscriberCount()).toEqual(4)

        pubSubService.unsubscribe(EventType.Refill, refillSubscriber);
        pubSubService.unsubscribe(EventType.Sale, saleSubscriber1);

        expect(pubSubService.getSubscriberCount()).toEqual(2)
    });

    test('Should be able to publish MachineSaleEvent to subscribers', () => {
        const testMachine1 = new Machine('001')
        const testMachine2 = new Machine('002')
        const machines = [testMachine1, new Machine('002')];
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machines, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machines, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machines, warningEvents);
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
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machines, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machines, warningEvents);
        const refillSubscriber1 = new MachineRefillSubscriber(machines, warningEvents);
        const refillSubscriber2 = new MachineRefillSubscriber(machines, warningEvents);
        const refillSubscriber3 = new MachineRefillSubscriber(machines, warningEvents);
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
        const warningEvents = [];
        const saleSubscriber = new MachineSaleSubscriber(machines, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machines, warningEvents);
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
