// constants
enum EventType {
  Sale = 'sale',
  Refill = 'refill',
  Low = 'low',
  Ok = 'ok'
}

enum StockLevel {
  Ok = 3  // threshold to generate warning events
}

// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: EventType, handler: ISubscriber): void;
  unsubscribe ( type: EventType, handler: ISubscriber): void
}

interface MachineMap {
  [machineId: string]: Machine
}

// types
type EventTypeToSubscriberMap = {
  [eventType in EventType]?: ISubscriber[];
};

// events
abstract class BaseMachineEvent implements IEvent {
  protected readonly _machineId: string;

  constructor(machineId: string) {
    this._machineId = machineId;
  }

  machineId(): string {
    return this._machineId;
  }

  abstract type(): EventType;

  toString(): string {
    return `${this.constructor.name}(machineId=${this._machineId},type=${this.type()})`
  }
}

class MachineSaleEvent extends BaseMachineEvent {
  constructor(private readonly _sold: number, _machineId: string) {
    super(_machineId);
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): EventType {
    return EventType.Sale;
  }

  toString(): string {
    return `${this.constructor.name}(type=${this.type()},machineId=${this.machineId()},sold=${this.getSoldQuantity()})`
  }
}

class MachineRefillEvent extends BaseMachineEvent {
  constructor(private readonly _refill: number, _machineId: string) {
    super(_machineId);
  }

  getRefillQuantity():number {
    return this._refill;
  }

  type(): EventType {
    return EventType.Refill;
  }

  toString(): string {
    return `${this.constructor.name}(type=${this.type()},machineId=${this.machineId()},refill=${this.getRefillQuantity()})`
  }
}

class MachineLowStockWarningEvent extends BaseMachineEvent {
  constructor(machineId: string) {
    super(machineId);
  }

  type(): EventType {
    return EventType.Low
  }
}

class MachineStockLevelOkEvent extends BaseMachineEvent {
  constructor(machineId: string) {
    super(machineId);
  }

  type(): EventType {
    return EventType.Ok;
  }
}

type TMachineWarningEvent = MachineLowStockWarningEvent | MachineStockLevelOkEvent;

// subscribers
abstract class BaseMachineSubscriber implements ISubscriber {
  protected machines: MachineMap;

  constructor(machines: Machine[]) {
    this.machines = {};
    for (let machine of machines) {
      this.machines[machine.id] = machine;
    }
  }

  abstract handle(event: IEvent);
}

class MachineSaleSubscriber extends BaseMachineSubscriber {
  public warningEvents: TMachineWarningEvent[];

  constructor (machines: Machine[], warningEvents: TMachineWarningEvent[]) {
    super(machines);

    this.warningEvents = warningEvents;
  }

  handle(event: MachineSaleEvent): void {
    // update the stock level of the machine associated with the machineId of the event
    const machine = this.machines[event.machineId()];
    const soldQuantity = event.getSoldQuantity();

    // If a machine stock levels drops below 3, LowStockWarningEvent should be generated just once
    if (machine.stockLevel >= StockLevel.Ok && machine.stockLevel - soldQuantity < StockLevel.Ok) {
      this.warningEvents.push(new MachineLowStockWarningEvent(event.machineId()))
    }

    // stock level should never go negative. The stock level should be capped at 0
    if (machine.stockLevel < soldQuantity) {
      machine.stockLevel = 0;
    } else {
      machine.stockLevel -= soldQuantity;
    }
  }
}

class MachineRefillSubscriber extends BaseMachineSubscriber {
  public warningEvents: TMachineWarningEvent[];

  constructor(machines: Machine[], warningEvents: TMachineWarningEvent[]) {
    super(machines);

    this.warningEvents = warningEvents;
  }

  handle(event: MachineRefillEvent): void {
    const machine = this.machines[event.machineId()];

    // When the stock level hits 3 or above, a StockLevelOkEvent should be generated just once
    if (machine.stockLevel < StockLevel.Ok && machine.stockLevel + event.getRefillQuantity() >= StockLevel.Ok) {
      this.warningEvents.push(new MachineStockLevelOkEvent(event.machineId()))
    }

    // assumption: there is no limit on the stock level
    machine.stockLevel += event.getRefillQuantity();
  }
}

class MachineLowStockSubscriber extends BaseMachineSubscriber {
    constructor (machines: Machine[]) {
      super(machines);
    }

  handle(event: MachineLowStockWarningEvent) {
    // bring the stock level back to the default level when it hits the low threshold
    const machine = this.machines[event.machineId()];
    if (machine.stockLevel < StockLevel.Ok) {
      machine.stockLevel = 10; // TODO: Add default to enum
    }
  }
}

// pubsub
class MachinePublishSubscribeService implements IPublishSubscribeService {
  public iSubscribers: EventTypeToSubscriberMap;

  constructor() {
    this.iSubscribers = {
      [EventType.Sale]: [],
      [EventType.Refill]: [],
      [EventType.Low]: [],
      [EventType.Ok]: [],
    };
  }

  getSubscriberInfo(): string {
    return `MachineSaleSubscribersCount=${this.iSubscribers[EventType.Sale].length}, MachineRefillSubscriberCount=${this.iSubscribers[EventType.Refill].length}`
  }

  getSubscriberCount(): number {
    return this.iSubscribers[EventType.Sale].length + this.iSubscribers[EventType.Refill].length;
  }

  publish(event: IEvent) {
    if (event.type() === EventType.Sale) {
      // Alert Only the Sale subscribers
      const saleSubscirbers = this.iSubscribers[EventType.Sale]
      for (let s of saleSubscirbers) {
        s.handle(event)
      }
    } else if (event.type() === EventType.Refill) {
      const refillSubscribers = this.iSubscribers[EventType.Refill]
      for (let s of refillSubscribers) {
        s.handle(event)
      }
    } else if (event.type() === EventType.Low) {
      const lowStockSubscribers = this.iSubscribers[EventType.Low]
      for (let s of lowStockSubscribers) {
        s.handle(event)
      }
    } else {
      console.log(`Do nothing for ${event}`)
    }
  }

  subscribe(type: EventType, handler: ISubscriber) {
    // { 'sale' : [ saleSubscriber1, saleSubscriber2 ]
    this.iSubscribers[type].push(handler)
  }

  unsubscribe(type: EventType, handler: ISubscriber) {
    const index = this.iSubscribers[type].indexOf(handler);
    if (index > -1) {
      this.iSubscribers[type].splice(index, 1);
    }
  }
}


// objects
class Machine {
  public stockLevel: number;
  public id: string;

  constructor(id: string, stockLevel: number = 10) {
    this.id = id;
    this.stockLevel = stockLevel;
  }

  toString(): string {
    return `${this.constructor.name}(id:${this.id},stockLevel:${this.stockLevel})`
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  } 
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}

const logMachines = (machines: Machine[]): void => {
  for (let m of machines) {
    console.log(m.toString())
  }
};

async function main() {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];

  // warning events to be generated by subscribers
  const warningEvents: TMachineWarningEvent[] = [];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines, warningEvents);
  const saleSubscriber2 = new MachineSaleSubscriber(machines, warningEvents);
  const saleSubscriber3 = new MachineSaleSubscriber(machines, warningEvents);
  const saleSubscriber4 = new MachineSaleSubscriber(machines, warningEvents);
  const refillSubscriber = new MachineRefillSubscriber(machines, warningEvents);
  const lowStockSubscriber = new MachineLowStockSubscriber(machines);

  // create the PubSub service
  const pubSubService: MachinePublishSubscribeService = new MachinePublishSubscribeService(); // implement and fix this

  // register different types of subscribers to the pub sub
  pubSubService.subscribe(EventType.Sale, saleSubscriber)
  pubSubService.subscribe(EventType.Sale, saleSubscriber2)
  pubSubService.subscribe(EventType.Sale, saleSubscriber3)
  pubSubService.subscribe(EventType.Sale, saleSubscriber4)
  pubSubService.subscribe(EventType.Refill, refillSubscriber)
  pubSubService.subscribe(EventType.Low, lowStockSubscriber)

  // create 5 random events
  const events = [1,2,3,4,5].map(i => eventGenerator());

  // display workflow
  console.log(`>>>> Processing the initial list of events: ${events.length} events`)
  logMachines(machines);
  console.log(pubSubService.getSubscriberInfo())

  for (let e of events) {
    console.log(`>> Applying Event: ${e.toString()}`)
    pubSubService.publish(e);
    logMachines(machines);
    console.log('====')
  }

  console.log('>>>> DONE')

  console.log(`>>>> Processing the warning events: ${warningEvents.length} events`)
  for (let e of warningEvents) {
    console.log(`>> Applying Event: ${e.toString()}`)
    pubSubService.publish(e);
    logMachines(machines);
    console.log('====')
  }
}

export {
  main,
  Machine,
  MachineSaleEvent,
  MachineRefillEvent,
  MachineLowStockWarningEvent,
  MachineStockLevelOkEvent,
  MachineSaleSubscriber,
  MachineRefillSubscriber,
  MachineLowStockSubscriber,
  MachinePublishSubscribeService,
  EventType,
  StockLevel,
}