/**
 * MySQL Database Adapter
 * Implements IDatabase interface for MySQL backend
 * NOTE: This adapter is for backend/server-side use only
 * For client-side use, communicate with MySQL via REST API endpoints
 */

import type {
  IDatabase,
  AuthContext,
  QueryResult,
  ListQueryResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
} from './types';

// These imports are for server-side use only
// @ts-ignore - Server-side imports
import {
  query,
  queryOne,
  queryAll,
  insert,
  execute,
  transaction,
} from '@/server/db/mysql/connection';
// @ts-ignore - Server-side imports
import {
  getAuthContext,
  canRead as authCanRead,
  canWrite as authCanWrite,
  canDelete as authCanDelete,
} from '@/server/db/mysql/authorization';

export class MySQLAdapter implements IDatabase {
  async getAuthContext(userId: string): Promise<AuthContext | null> {
    try {
      const user = await getAuthContext(userId);
      return user;
    } catch (error) {
      console.error('Error getting auth context:', error);
      return null;
    }
  }

  async select<T>(table: string, filter?: Record<string, any>): Promise<ListQueryResult<T>> {
    try {
      let sql = `SELECT * FROM ${table}`;
      const params: any[] = [];

      if (filter && Object.keys(filter).length > 0) {
        const conditions = Object.entries(filter)
          .filter(([_, value]) => value !== undefined)
          .map(([key, _]) => {
            params.push(filter[key]);
            return `${key} = ?`;
          });

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
      }

      const data = await queryAll<T>(sql, params);
      return { data: data || [], error: null, count: data?.length || 0 };
    } catch (error) {
      return { data: [], error: error as Error, count: 0 };
    }
  }

  async selectOne<T>(table: string, id: string): Promise<QueryResult<T>> {
    try {
      const data = await queryOne<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async selectBy<T>(table: string, filter: Record<string, any>): Promise<ListQueryResult<T>> {
    return this.select<T>(table, filter);
  }

  async insert<T>(table: string, data: Partial<T>): Promise<InsertResult> {
    try {
      const fields = Object.keys(data).join(', ');
      const values = Object.values(data);
      const placeholders = values.map(() => '?').join(', ');

      const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
      const result = await insert(sql, values);

      return { id: result.insertId.toString(), error: null };
    } catch (error) {
      return { id: '', error: error as Error };
    }
  }

  async insertMany<T>(table: string, data: Partial<T>[]): Promise<InsertResult> {
    try {
      if (data.length === 0) {
        return { id: '', error: new Error('No data to insert') };
      }

      const fields = Object.keys(data[0]).join(', ');
      const placeholders = data
        .map(() => '(' + Object.keys(data[0]).map(() => '?').join(', ') + ')')
        .join(', ');

      const values = data.flatMap(row => Object.values(row));
      const sql = `INSERT INTO ${table} (${fields}) VALUES ${placeholders}`;
      const result = await insert(sql, values);

      return { id: result.insertId.toString(), error: null };
    } catch (error) {
      return { id: '', error: error as Error };
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<UpdateResult> {
    try {
      const fields = Object.keys(data)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(data), id];

      const sql = `UPDATE ${table} SET ${fields} WHERE id = ?`;
      const result = await execute(sql, values);

      return { error: null, affectedRows: result.affectedRows };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<UpdateResult> {
    try {
      const fields = Object.keys(data)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.values(data);
      const filterConditions = Object.entries(filter)
        .map(([key, _]) => {
          values.push(filter[key]);
          return `${key} = ?`;
        });

      const sql = `UPDATE ${table} SET ${fields} WHERE ${filterConditions.join(' AND ')}`;
      const result = await execute(sql, values);

      return { error: null, affectedRows: result.affectedRows };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<DeleteResult> {
    try {
      const sql = `DELETE FROM ${table} WHERE id = ?`;
      const result = await execute(sql, [id]);

      return { error: null, affectedRows: result.affectedRows };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<DeleteResult> {
    try {
      const conditions = Object.entries(filter)
        .map(([key, value]) => {
          if (value === null) {
            return `${key} IS NULL`;
          }
          return `${key} = ?`;
        });

      const values = Object.entries(filter)
        .filter(([_, value]) => value !== null)
        .map(([_, value]) => value);

      const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;
      const result = await execute(sql, values);

      return { error: null, affectedRows: result.affectedRows };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async raw<T>(sql: string, params?: any[]): Promise<ListQueryResult<T>> {
    try {
      const data = await queryAll<T>(sql, params);
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  async canRead(table: string, recordId: string, auth: AuthContext): Promise<boolean> {
    try {
      return await authCanRead(auth, table, recordId);
    } catch (error) {
      console.error('Error checking read permission:', error);
      return false;
    }
  }

  async canWrite(table: string, recordId: string | null, companyId: string, auth: AuthContext): Promise<boolean> {
    try {
      return await authCanWrite(auth, table, recordId, companyId);
    } catch (error) {
      console.error('Error checking write permission:', error);
      return false;
    }
  }

  async canDelete(table: string, recordId: string, auth: AuthContext): Promise<boolean> {
    try {
      return await authCanDelete(auth, table, recordId);
    } catch (error) {
      console.error('Error checking delete permission:', error);
      return false;
    }
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    return transaction(async () => {
      return callback(this);
    });
  }

  async initialize(): Promise<void> {
    // MySQL pool initialization is handled by the connection module
    console.log('✅ MySQL adapter initialized');
  }

  async close(): Promise<void> {
    // Close is handled by the connection module if needed
  }

  async health(): Promise<boolean> {
    try {
      const data = await queryOne('SELECT 1 as health');
      return !!data;
    } catch (error) {
      console.error('MySQL health check failed:', error);
      return false;
    }
  }
}

export const mysqlAdapter = new MySQLAdapter();
