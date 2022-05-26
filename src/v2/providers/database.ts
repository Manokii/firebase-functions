// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { apps } from '../../apps';
import { Change } from '../../cloud-functions';
import { DataSnapshot } from '../../common/providers/database';
import { ManifestEndpoint } from '../../runtime/manifest';
import { normalizePath } from '../../utilities/path';
import { applyChange } from '../../utils';
import { CloudEvent, CloudFunction } from '../core';
import * as options from '../options';

export { DataSnapshot };

/** @hidden */
const WILDCARD_REGEX = new RegExp('{[^/{}]*}', 'g');

/** @internal */
export const writtenEventType = 'google.firebase.database.ref.v1.written';

/** @internal */
export const createdEventType = 'google.firebase.database.ref.v1.created';

/** @internal */
export const updatedEventType = 'google.firebase.database.ref.v1.updated';

/** @internal */
export const deletedEventType = 'google.firebase.database.ref.v1.deleted';

/** @internal */
export interface RawRTDBCloudEventData {
  ['@type']: 'type.googleapis.com/google.events.firebase.database.v1.ReferenceEventData';
  data: any;
  delta: any;
}

/** @internal */
export interface RawRTDBCloudEvent extends CloudEvent<RawRTDBCloudEventData> {
  /** The domain of the database instance */
  firebasedatabasehost: string;
  /** The instance ID portion of the fully qualified resource name */
  instance: string;
  /** The database reference path */
  ref: string;
  /** The location of the database */
  location: string;
}

export interface DatabaseEvent<T> extends CloudEvent<T> {
  /** The domain of the database instance */
  firebaseDatabaseHost: string;
  /** The instance ID portion of the fully qualified resource name */
  instance: string;
  /** The database reference path */
  ref: string;
  /** The location of the database */
  location: string;
  /**
   * An object containing the values of the path patterns.
   * Only named capture groups will be populated - {key}, {key=*}, {key=**}
   */
  params: Record<string, string>;
}

export interface ReferenceOptions extends options.EventHandlerOptions {
  /**
   * Specify the handler to trigger on a database reference(s).
   * This value can either be a single reference or a pattern.
   * Examples~ '/foo/bar', '/foo/{bar} '
   */
  ref: string;
  /**
   * Specify the handler to trigger on a database instance(s).
   * If present, this value can either be a single instance or a pattern.
   * Examples~ 'my-instance-1', '{instance}', '*'
   */
  instance?: string;
}

export function onRefWritten(
  reference: string,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
export function onRefWritten(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
export function onRefWritten(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  return onOperation(
    writtenEventType,
    referenceOrOpts,
    handler,
    true
  ) as CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
}

export function onRefCreated(
  reference: string,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;
export function onRefCreated(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;
export function onRefCreated(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>> {
  return onOperation(
    createdEventType,
    referenceOrOpts,
    handler,
    false
  ) as CloudFunction<DatabaseEvent<DataSnapshot>>;
}

export function onRefUpdated(
  reference: string,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
export function onRefUpdated(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
export function onRefUpdated(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  return onOperation(
    updatedEventType,
    referenceOrOpts,
    handler,
    true
  ) as CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;
}

export function onRefDeleted(
  reference: string,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;
export function onRefDeleted(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;
export function onRefDeleted(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>> {
  return onOperation(
    deletedEventType,
    referenceOrOpts,
    handler,
    false
  ) as CloudFunction<DatabaseEvent<DataSnapshot>>;
}

/** @internal */
export function getOpts(referenceOrOpts: string | ReferenceOptions) {
  let path: string, instance: string, opts: options.EventHandlerOptions;
  if (typeof referenceOrOpts === 'string') {
    path = normalizePath(referenceOrOpts);
    instance = '*';
    opts = {};
  } else {
    path = normalizePath(referenceOrOpts.ref);
    instance = referenceOrOpts.instance || '*';
    opts = { ...referenceOrOpts };
    delete (opts as any).ref;
    delete (opts as any).instance;
  }

  return {
    path,
    instance,
    opts,
  };
}

/** @hidden */
function trimParam(param: string) {
  const paramNoBraces = param.slice(1, -1);
  if (paramNoBraces.includes('=')) {
    return paramNoBraces.slice(0, paramNoBraces.indexOf('='));
  }
  return paramNoBraces;
}

/** @internal */
export function matchParams(
  pathSegments: string[],
  wildcards: RegExpMatchArray,
  refSegments: string[],
  params: Record<string, string>
): void {
  let wildcardNdx = 0,
    refNdx = 0;
  for (
    let pathNdx = 0;
    pathNdx < pathSegments.length && wildcardNdx < wildcards.length;
    pathNdx++
  ) {
    if (pathSegments[pathNdx].includes('**')) {
      const remaining = pathSegments.length - 1 - pathNdx;
      const newRefNdx = refSegments.length - 1 - remaining;
      if (pathSegments[pathNdx] === wildcards[wildcardNdx]) {
        params[trimParam(wildcards[wildcardNdx])] = refSegments
          .slice(refNdx, newRefNdx + 1)
          .join('/');
        wildcardNdx++;
      }
      refNdx = newRefNdx + 1;
    } else {
      if (pathSegments[pathNdx] === wildcards[wildcardNdx]) {
        params[trimParam(wildcards[wildcardNdx])] = refSegments[refNdx];
        wildcardNdx++;
      }
      refNdx++;
    }
  }
}

/** @internal */
export function makeParams(
  event: RawRTDBCloudEvent,
  path: string,
  instance: string
): Record<string, string> {
  const params: Record<string, string> = {};

  const pathWildcards = path.match(WILDCARD_REGEX);
  if (pathWildcards) {
    matchParams(path.split('/'), pathWildcards, event.ref.split('/'), params);
  }

  const instanceWildcards = instance.match(WILDCARD_REGEX);
  if (instanceWildcards) {
    matchParams([instance], instanceWildcards, [event.instance], params);
  }

  return params;
}

/** @hidden */
function makeDatabaseEvent(
  event: RawRTDBCloudEvent,
  instance: string,
  params: Record<string, string>
): DatabaseEvent<DataSnapshot> {
  const snapshot = new DataSnapshot(
    event.data.delta,
    event.ref,
    apps().admin,
    instance
  );
  const databaseEvent: DatabaseEvent<DataSnapshot> = {
    ...event,
    firebaseDatabaseHost: event.firebasedatabasehost,
    data: snapshot,
    params,
  };
  delete (databaseEvent as any).firebasedatabasehost;
  return databaseEvent;
}

/** @hidden */
function makeChangedDatabaseEvent(
  event: RawRTDBCloudEvent,
  instance: string,
  params: Record<string, string>
): DatabaseEvent<Change<DataSnapshot>> {
  const before = new DataSnapshot(
    event.data.data,
    event.ref,
    apps().admin,
    instance
  );
  const after = new DataSnapshot(
    applyChange(event.data.data, event.data.delta),
    event.ref,
    apps().admin,
    instance
  );
  const databaseEvent: DatabaseEvent<Change<DataSnapshot>> = {
    ...event,
    firebaseDatabaseHost: event.firebasedatabasehost,
    data: {
      before,
      after,
    },
    params,
  };
  delete (databaseEvent as any).firebasedatabasehost;
  return databaseEvent;
}

/** @internal */
export function onOperation(
  eventType: string,
  referenceOrOpts: string | ReferenceOptions,
  handler: (
    event: DatabaseEvent<DataSnapshot> | DatabaseEvent<Change<DataSnapshot>>
  ) => any | Promise<any>,
  changed: boolean
):
  | CloudFunction<DatabaseEvent<DataSnapshot>>
  | CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  const { path, instance, opts } = getOpts(referenceOrOpts);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawRTDBCloudEvent;
    const instanceUrl = `https://${event.instance}.${event.firebasedatabasehost}`;
    const params = makeParams(event, path, instance);
    const databaseEvent = changed
      ? makeChangedDatabaseEvent(event, instanceUrl, params)
      : makeDatabaseEvent(event, instanceUrl, params);
    return handler(databaseEvent);
  };

  func.run = handler;

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const eventFilters: Record<string, string> = {};
  const eventFilterPathPatterns: Record<string, string> = {};
  if (path.match(WILDCARD_REGEX) || path.includes('*')) {
    eventFilterPathPatterns.ref = path;
  } else {
    eventFilters.ref = path;
  }
  if (instance.match(WILDCARD_REGEX) || instance.includes('*')) {
    eventFilterPathPatterns.instance = instance;
  } else {
    eventFilters.instance = instance;
  }

  const endpoint: ManifestEndpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters,
      eventFilterPathPatterns,
      retry: false,
    },
  };

  func.__endpoint = endpoint;

  return func;
}
