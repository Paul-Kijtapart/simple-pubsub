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
    MachineSaleSubscriber,
    MachineCollection,
} from "./app.ts";

describe('Machine', () => {
    test('Should be able to create a machine with proper param', () => {
        const m1 = new Machine('001')
        expect(m1.stockLevel).toEqual(StockLevel.Default)
        expect(m1.id).toEqual('001')
    });
});

describe('MachineCollection', () => {
    test('Should be able to create MachineCollection', () => {
        const testMachine = new Machine('001')
        const testMachine2 = new Machine('002')
        const machines = [testMachine];

        const mc = new MachineCollection(machines)

        expect(mc.getMachineCount()).toEqual(1)
        expect(mc.getMachineById(testMachine.id)).toEqual(testMachine);

        mc.addMachine(testMachine2);

        expect(mc.getMachineCount()).toEqual(2)
        expect(mc.getMachineById(testMachine2.id)).toEqual(testMachine2);
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
    let testMachine: Machine;
    let testMachine2: Machine;
    let testMachine3: Machine;
    let machines: Machine[];
    let machineCollection: MachineCollection;

    beforeEach(() => {
        testMachine = new Machine('001');
        testMachine2 = new Machine('002');
        testMachine3 = new Machine('003');
        machines = [testMachine, testMachine2, testMachine3];
        machineCollection = new MachineCollection(machines);
    });

    test('Should be able to create a MachineSaleSubscriber', () => {
        const soldAmount = 3;
        const testSaleSubscriber = new MachineSaleSubscriber(machineCollection, []);
        const testSaleEvent = new MachineSaleEvent(soldAmount, testMachine.id)

        expect(testMachine.stockLevel).toEqual(StockLevel.Default)

        testSaleSubscriber.handle(testSaleEvent);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default - soldAmount)
    });

    test('Should generate MachineLowStockWarningEvent when stockLevel drops below Ok level just once', () => {
        const soldAmount = 7;
        const warningEvents = [];
        const testSaleSubscriber = new MachineSaleSubscriber(machineCollection, warningEvents);
        const testSaleEvent = new MachineSaleEvent(soldAmount, testMachine.id)

        expect(testMachine.stockLevel).toEqual(StockLevel.Default)
        expect(warningEvents.length).toEqual(0);

        testSaleSubscriber.handle(testSaleEvent);

        expect(testMachine.stockLevel).toEqual(StockLevel.Ok)
        expect(warningEvents.length).toEqual(0);

        const testSaleEvent2 = new MachineSaleEvent(1, testMachine.id)
        testSaleSubscriber.handle(testSaleEvent2);

        expect(warningEvents.length).toEqual(1);

        const testSaleEvent3 = new MachineSaleEvent(1, testMachine.id)
        testSaleSubscriber.handle(testSaleEvent3);

        expect(warningEvents.length).toEqual(1);
    });

    test('MachineSaleSubscriber should not make stockLevel go negative', () => {
        const exceededSoldAmount = 20;
        const warningEvents = [];
        const testSaleSubscriber = new MachineSaleSubscriber(machineCollection, warningEvents);
        const testSaleEvent = new MachineSaleEvent(exceededSoldAmount, testMachine.id)

        expect(testMachine.stockLevel).toEqual(StockLevel.Default)
        expect(warningEvents.length).toEqual(0);

        testSaleSubscriber.handle(testSaleEvent);

        expect(warningEvents.length).toEqual(1);
        expect(testMachine.stockLevel).toEqual(0)
    });

    test('Should be able to create a MachineRefillSubscriber', () => {
        const refillAmount = 5;
        const testRefillSubscriber = new MachineRefillSubscriber(machineCollection, []);
        const testRefillEvent = new MachineRefillEvent(refillAmount, testMachine.id)

        expect(testMachine.stockLevel).toEqual(StockLevel.Default)

        testRefillSubscriber.handle(testRefillEvent);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default + refillAmount)
    });

    test('MachineRefillSubscriber should generate MachineStockLevelOkEvent when pass Ok threshold just once', () => {
        const testStockLevel = StockLevel.Ok - 1;
        const testMachine = new Machine('001', testStockLevel)
        const machines: Machine[] = [testMachine, new Machine('002'), new Machine('003')];
        const machineCollection: MachineCollection = new MachineCollection(machines);
        const refillAmount = 5;
        const warningEvents = [];
        const testRefillSubscriber = new MachineRefillSubscriber(machineCollection, warningEvents);
        const testRefillEvent = new MachineRefillEvent(refillAmount, testMachine.id)

        expect(testMachine.stockLevel).toEqual(testStockLevel)
        expect(warningEvents.length).toEqual(0);

        testRefillSubscriber.handle(testRefillEvent);

        expect(warningEvents.length).toEqual(1);
        expect(testMachine.stockLevel).toEqual(testStockLevel + refillAmount)
    });

    test('MachineSaleSubscriber should fail to handle non-MachineSaleEvent', () => {
        const testMachine = new Machine('001')
        const machines: Machine[] = [testMachine, new Machine('002'), new Machine('003')];
        const soldAmount = 3;
        const testRefillSubscriber = new MachineRefillSubscriber(machineCollection, []);

        const testSaleEvent = new MachineSaleEvent(soldAmount, testMachine.id)

        expect(() => {
            // @ts-ignore
            testRefillSubscriber.handle(testSaleEvent)
        }).toThrow(TypeError)
    });
});

describe('MachinePublishSubscribeService', () => {
    let testMachine: Machine;
    let testMachine2: Machine;
    let testMachine3: Machine;
    let machines: Machine[];
    let machineCollection: MachineCollection;


    beforeEach(() => {
        testMachine = new Machine('001');
        testMachine2 = new Machine('002');
        testMachine3 = new Machine('003');
        machines = [testMachine, testMachine2, testMachine3];
        machineCollection = new MachineCollection(machines);
    });

    test('Should be able to subscribe/unsubscribe different types of subscribers', () => {
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machineCollection, warningEvents);
        const refillSubscriber2 = new MachineRefillSubscriber(machineCollection, warningEvents);
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
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machineCollection, warningEvents);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)

        const testSaleQty = 3;
        const testSaleEvents = new MachineSaleEvent(testSaleQty, testMachine.id);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);

        pubSubService.publish(testSaleEvents);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default - testSaleQty * 2);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);
    });

    test('Should be able to publish MachineRefill to subscribers', () => {
        const warningEvents = [];
        const saleSubscriber1 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const saleSubscriber2 = new MachineSaleSubscriber(machineCollection, warningEvents);
        const refillSubscriber1 = new MachineRefillSubscriber(machineCollection, warningEvents);
        const refillSubscriber2 = new MachineRefillSubscriber(machineCollection, warningEvents);
        const refillSubscriber3 = new MachineRefillSubscriber(machineCollection, warningEvents);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber1)
        pubSubService.subscribe(EventType.Sale, saleSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber1)
        pubSubService.subscribe(EventType.Refill, refillSubscriber2)
        pubSubService.subscribe(EventType.Refill, refillSubscriber3)

        const testRefillQty = 4;
        const testRefillEvent = new MachineRefillEvent(testRefillQty, testMachine.id);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);

        pubSubService.publish(testRefillEvent);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default + testRefillQty * 3);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);
    });

    test('The subscribers should be working off a shared array of Machine objects, mutating them depending on the event received.', () => {
        const warningEvents = [];
        const saleSubscriber = new MachineSaleSubscriber(machineCollection, warningEvents);
        const refillSubscriber = new MachineRefillSubscriber(machineCollection, warningEvents);
        const pubSubService = new MachinePublishSubscribeService();
        pubSubService.subscribe(EventType.Sale, saleSubscriber)
        pubSubService.subscribe(EventType.Refill, refillSubscriber)

        const testRefillQty = 4;
        const testSaleEvents = new MachineRefillEvent(testRefillQty, testMachine.id);

        const testSaleQty = 3;
        const testRefillEvent = new MachineSaleEvent(testSaleQty, testMachine.id);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);

        pubSubService.publish(testSaleEvents);
        pubSubService.publish(testRefillEvent);

        expect(testMachine.stockLevel).toEqual(StockLevel.Default + testRefillQty - testSaleQty);
        expect(testMachine2.stockLevel).toEqual(StockLevel.Default);
    });
});
