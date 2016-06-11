/// <reference path="../gcf.d.ts" />
/// <reference path="../../typings/index.d.ts" />
/// <reference path="../trigger.d.ts" />

import FirebaseEvent from '../event';
import DatabaseDeltaSnapshot from './delta-snapshot';
import {normalizePath, tokenToApp} from '../utils';
import * as functions from '../index';

interface DatabaseTriggerDefinition extends FirebaseTriggerDefinition {
  path: string;
}

export default class DatabaseBuilder {
  private _path: string;
  private _condition: string;
  private _filter: string;

  _toConfig(event?: string): DatabaseTriggerDefinition {
    return {
      service: 'firebase.database',
      event: event || 'write',
      path: this._path
    };
  }

  path(path: string): DatabaseBuilder {
    this._path = this._path || '';
    this._path += normalizePath(path);
    return this;
  }

  on(event: string, handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): GCFHandler {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
    }

    let wrappedHandler: GCFHandler = function(data: GCFDatabasePayload) {
      let event = new FirebaseEvent<DatabaseDeltaSnapshot>({
        service: 'firebase.database',
        type: data['event'],
        instance: functions.env.get('firebase.database.url'),
        data: new DatabaseDeltaSnapshot(data),
        params: data.params,
        app: tokenToApp(data.authToken)
      });

      return handler(event);
    };

    wrappedHandler.__trigger = this._toConfig();
    return wrappedHandler;
  }
}