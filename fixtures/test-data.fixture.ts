import { test as base } from '@playwright/test';
import type { WorkBook } from 'xlsx';
import * as XLSX from 'xlsx';

/**
 * Data-Driven Testing (DDT) Fixture
 * Loads test data from Excel/CSV files
 */

export interface DataFixtures {
  testData: {
    loadFromExcel: (filePath: string, sheetName?: string) => Promise<unknown[]>;
    loadFromCSV: (filePath: string) => Promise<unknown[]>;
    getRecord: (filePath: string, key: string, keyField?: string) => Promise<unknown>;
  };
}

export const dataFixture = base.extend<DataFixtures>({
  testData: async (_, use) => {
    const data = {
      loadFromExcel: async (filePath: string, sheetName?: string): Promise<unknown[]> => {
        try {
          const workbook: WorkBook = XLSX.readFile(filePath, { cellDates: true });
          const sheet = sheetName || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          return jsonData;
        } catch (error) {
          console.error(`[DataFixture] Error loading Excel file ${filePath}:`, error);
          return [];
        }
      },

      loadFromCSV: async (filePath: string): Promise<unknown[]> => {
        try {
          const workbook: WorkBook = XLSX.readFile(filePath, { type: 'file' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          return jsonData;
        } catch (error) {
          console.error(`[DataFixture] Error loading CSV file ${filePath}:`, error);
          return [];
        }
      },

      getRecord: async (filePath: string, key: string, keyField = 'id'): Promise<unknown> => {
        const records = await data.loadFromExcel(filePath);
        return records.find(
          (record: unknown) => (record as Record<string, unknown>)[keyField] === key
        );
      },
    };

    await use(data);
  },
});
