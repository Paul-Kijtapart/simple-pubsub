// constants
enum EventType {
  Sale = 'sale',
  Refill = 'refill',
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
  constructor (machines: Machine[]) {
    super(machines);
  }

  handle(event: MachineSaleEvent): void {
    // update the stock level of the machine associated with the machineId of the event
    const machine = this.machines[event.machineId()];
    const soldQuantity = event.getSoldQuantity();

    // stock level should never go negative. The stock level should be capped at 0
    if (machine.stockLevel < soldQuantity) {
      machine.stockLevel = 0;
    } else {
      machine.stockLevel -= soldQuantity;
    }
  }
}

class MachineRefillSubscriber extends BaseMachineSubscriber {
  constructor(machines: Machine[]) {
    super(machines);
  }

  handle(event: MachineRefillEvent): void {
    const machine = this.machines[event.machineId()];

    // assumption: there is no limit on the stock level
    machine.stockLevel += event.getRefillQuantity();
  }
}

// pubsub
class MachinePublishSubscribeService implements IPublishSubscribeService {
  public iSubscribers: EventTypeToSubscriberMap;

  constructor() {
    this.iSubscribers = {
      [EventType.Sale]: [],
      [EventType.Refill]: [],
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
  public stockLevel = 10;
  public id: string;

  constructor (id: string) {
    this.id = id;
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

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);
  const saleSubscriber2 = new MachineSaleSubscriber(machines);
  const saleSubscriber3 = new MachineSaleSubscriber(machines);
  const refillSubscriber = new MachineRefillSubscriber(machines);

  // create the PubSub service
  const pubSubService: MachinePublishSubscribeService = new MachinePublishSubscribeService(); // implement and fix this
  pubSubService.subscribe(EventType.Sale, saleSubscriber)
  pubSubService.subscribe(EventType.Sale, saleSubscriber2)
  pubSubService.subscribe(EventType.Sale, saleSubscriber3)
  pubSubService.subscribe(EventType.Refill, refillSubscriber)

  // create 5 random events
  const events = [1,2,3,4,5].map(i => eventGenerator());

  // publish the events
  console.log('>>>> INITIAL')
  logMachines(machines);
  console.log(pubSubService.getSubscriberInfo())

  for (let e of events) {
    console.log(`>> Applying Event: ${e.toString()}`)

    pubSubService.publish(e);

    logMachines(machines);
    console.log('====')
  }

  console.log('>>>> DONE')
}

export {
  main,
  Machine,
  MachineSaleEvent,
  MachineRefillEvent,
  MachineSaleSubscriber,
  MachineRefillSubscriber,
  MachinePublishSubscribeService,
  EventType,
}