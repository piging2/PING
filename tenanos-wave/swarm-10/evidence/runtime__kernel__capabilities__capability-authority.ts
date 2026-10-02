import { ICapabilityAuthority, Capability, CapabilityRequirements, CapabilityFilters } from './capability-authority-interface';
import { CapabilityRegistry } from './capability-registry';
import { CapabilityResolver, CapabilityRequest } from './capability-resolver';
import { CapabilityID, Priority, LatencyClass } from './capability';

export class CapabilityAuthority implements ICapabilityAuthority {
  private registry: CapabilityRegistry;
  private resolver: CapabilityResolver;

  constructor() {
    this.registry = new CapabilityRegistry();
    this.resolver = new CapabilityResolver(this.registry);
  }

  register(capability: Capability): void {
    this.registry.registerCapability(capability as import('./capability').Capability);
  }

  unregister(capabilityId: string): void {
    this.registry['capabilities'].delete(capabilityId as CapabilityID);
  }

  get(capabilityId: string): Capability | null {
    const cap = this.registry.getCapability(capabilityId as CapabilityID);
    return cap ? this.toInterfaceCapability(cap) : null;
  }

  resolve(requirements: CapabilityRequirements): Capability[] {
    const request: CapabilityRequest = {
      inputTypes: requirements.inputTypes,
      outputTypes: requirements.outputTypes,
      requiredPolicies: requirements.policies,
      maxLatency: requirements.maxLatency ? LatencyClass.Batch : undefined,
      maxCost: requirements.maxCost,
      deterministic: requirements.deterministic,
      replaySafe: requirements.replaySafe,
    };
    return this.resolver.resolve(request).map(c => this.toInterfaceCapability(c));
  }

  list(filters: CapabilityFilters): Capability[] {
    let results = this.registry.listCapabilities();

    if (filters.inputTypes) {
      results = results.filter(cap =>
        filters.inputTypes!.every(t => cap.inputs.some(i => i.type === t))
      );
    }
    if (filters.outputTypes) {
      results = results.filter(cap =>
        filters.outputTypes!.every(t => cap.outputs.some(o => o.type === t))
      );
    }
    if (filters.deterministic !== undefined) {
      results = results.filter(cap => cap.deterministic === filters.deterministic);
    }
    if (filters.replaySafe !== undefined) {
      results = results.filter(cap => cap.replaySafe === filters.replaySafe);
    }

    return results.map(c => this.toInterfaceCapability(c));
  }

  private toInterfaceCapability(cap: import('./capability').Capability): Capability {
    return {
      capabilityId: cap.identity,
      name: cap.identity,
      description: `Capability ${cap.identity} v${cap.version}`,
      inputs: cap.inputs.map(i => ({ name: i.name, type: i.type, required: i.required })),
      outputs: cap.outputs.map(o => ({ name: o.name, type: o.type })),
      requirements: {
        inputTypes: cap.inputs.map(i => i.type),
        outputTypes: cap.outputs.map(o => o.type),
        policies: cap.policies as string[],
        maxLatency: cap.latencyClass === LatencyClass.Realtime ? 100 : undefined,
        maxCost: cap.cost.amount,
        deterministic: cap.deterministic,
        replaySafe: cap.replaySafe,
        executorClass: cap.executorClass,
      },
      execution: {
        concurrency: cap.concurrency as any,
        priority: cap.priority as any,
        estimatedLatency: { min: 0, max: cap.timeout, unit: 'milliseconds' },
        estimatedCost: { currency: cap.cost.currency, amount: cap.cost.amount, unit: cap.cost.unit },
        resourceRequirements: cap.requiredResources,
      },
      governance: {
        authorities: cap.requiredAuthorities,
        policies: cap.policies as string[],
        constraints: [],
      },
    };
  }
}

