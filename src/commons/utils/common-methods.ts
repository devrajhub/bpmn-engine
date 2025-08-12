import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import { csv2json, json2csv } from 'json-2-csv';
import { join } from 'path';
import puppeteer from 'puppeteer';
// import admin from 'src/config/firebaseAdmin';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import base64url from 'base64url';
import { createHash, randomBytes } from 'crypto';
import { ApplicationConstants } from '../constants/application.constant';
import * as Interfaces from '../interface/common.interface';
import { ErrorMessages } from '../messages/error-messages';

export const CommonMethods = {
  getErrorMsg(code: string) {
    return `${code}: ${ErrorMessages[code]}`;
  },
  async encodePassword(password: string) {
    return await bcrypt.hash(password, 10);
  },
  getKeyReplacedString(aString: string, objMap: object) {
    for (const [key, value] of Object.entries(objMap)) {
      aString = aString.replace('$' + `{${key}}`, value);
    }

    return aString;
  },
  async extractSubstring(variableName: any, indexOfString: string) {
    try {
      const path = await variableName.indexOf(indexOfString);
      if (path) {
        return await variableName.substring(
          variableName.indexOf(indexOfString),
        );
      } else {
        return '';
      }
    } catch (err) {
      console.log(err);
    }
  },
  getErrorMsgCombinedString(code: string): string {
    return `${code}:- ${ErrorMessages[code]}`;
  },
  async generatePasswordHash(textToHash: string): Promise<string> {
    // const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(textToHash, 10);
    return hash;
  },

  async comparePasswordHash(password: string, pwd_hash: string) {
    const isMatch = await bcrypt.compare(password, pwd_hash);
    return isMatch;
  },
  validateDOBFormat(dob: string): boolean {
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    return dobRegex.test(dob);
  },
  getApplicationConstant(code: string) {
    return `${ApplicationConstants[code]}`;
  },
  getRandomString(numberOfCharacters: number = 10): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    const randomBytesArray = randomBytes(numberOfCharacters);
    let randomString = '';

    for (let i = 0; i < numberOfCharacters; i++) {
      randomString += characters.charAt(randomBytesArray[i] % charactersLength);
    }

    return randomString;
  },
  async registerHelpers() {
    Handlebars.registerHelper('isEqual', function (value1, value2) {
      return value1 === value2;
    });
  },
  async generatePdfFromTemplate(
    templateName: string,
    data: any,
  ): Promise<string> {
    const templateFile = await fs.readFile(
      join(__dirname, '..', '..', '..', 'templates', `${templateName}.hbs`),
      'utf-8',
    );
    const template = Handlebars.compile(templateFile);
    const html = template(data);
    return html;
  },

  async generatePdf(html: string): Promise<Buffer> {
    try {
      // Launch the browser with Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set the content of the page with the provided HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF from the content
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true, // Ensure background graphics are printed
      });

      await browser.close();

      // Convert Uint8Array to Buffer
      const pdfBuffer = Buffer.from(pdfUint8Array);

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Could not generate PDF.'); // Propagate the error to be handled by the calling function
    }
  },

  jsonToCsv(json: any) {
    /* Convert JSON data into CSV formate */
    const csv = json2csv(json);
    return csv;
  },

  csvToJson(csv: string) {
    /* Convert CSV data into JSON formate */
    const json = csv2json(csv);
    return json;
  },

  async generateExcel(
    sheets: Interfaces.ExcelSheetConfig[],
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach((sheetConfig) => {
      const worksheet = workbook.addWorksheet(sheetConfig.sheetName);

      worksheet.columns = sheetConfig.columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width || 20,
      }));

      for (let i = 0; i < sheetConfig.rowCount; i++) {
        worksheet.addRow({});
      }

      sheetConfig.columns.forEach((col, index) => {
        const colIndex = index + 1;

        if (col.dropdownOptions) {
          const dropdownValues = col.dropdownOptions
            .map((option) => option.key)
            .join(',');

          worksheet
            .getColumn(colIndex)
            .eachCell({ includeEmpty: true }, (cell) => {
              cell.dataValidation = {
                type: 'list',
                formulae: [`"${dropdownValues}"`],
                allowBlank: true,
              };

              if (col.multiSelect) {
                cell.note = 'Use comma (,) to separate multiple selections';
              }
            });
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  },
  formatDate(date: Date) {
    if (date) {
      const year = date.getFullYear();
      const month = `0${date.getMonth() + 1}`.slice(-2);
      const day = `0${date.getDate()}`.slice(-2);
      return `${year}-${month}-${day}`;
    }
  },
  formatDateToEpoch(date: Date | string | number) {
    if (date) {
      return new Date(date).getTime();
    }
  },
  startOfDay(date: Date | number): number {
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
  },

  endOfDay(date: Date | number): number {
    if (date) {
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return end.getTime();
    }
  },
  formatTimeFromEpoch(epoch: number): string {
    const date = new Date(epoch);

    const hours = `0${date.getHours()}`.slice(-2);
    const minutes = `0${date.getMinutes()}`.slice(-2);
    const seconds = `0${date.getSeconds()}`.slice(-2);

    // Return the formatted time as HH:MM:SS
    return `${hours}:${minutes}:${seconds}`;
  },

  maskPhoneNumber(phone: string): string {
    if (phone.length !== 10) {
      throw new Error('Phone number must be 10 digits long');
    }

    // Masking the phone number in the  format: 99XXXX8X99
    return `${phone.slice(0, 2)}XXXX${phone[6]}X${phone.slice(8)}`;
  },

  formatDateToDDMMYYYY(date: Date) {
    if (date) {
      const year = date.getFullYear();
      const month = `0${date.getMonth() + 1}`.slice(-2);
      const day = `0${date.getDate()}`.slice(-2);
      return `${day}-${month}-${year}`; // Change to DD-MM-YYYY format
    }
    return '';
  },
  generateOtp(otpLength: number = 6): string {
    let otp = '';
    const digits = '0123456789';

    for (let i = 0; i < otpLength; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }

    return otp;
  },

  getOtpExpirationTime(): Date {
    const otpValidityDurationInMinutes = 10;
    const expirationTime = new Date();
    expirationTime.setMinutes(
      expirationTime.getMinutes() + otpValidityDurationInMinutes,
    );
    return expirationTime;
  },

  filterNonNullValues(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([key, value]) =>
          key !== 'id' &&
          value !== null &&
          value !== undefined &&
          value !== '' &&
          !(
            typeof value === 'object' &&
            '_type' in value &&
            value._type === 'isNull'
          ),
      ),
    );
  },
  async generateCodeChallenge(code_verifier: string) {
    const base64Digest = createHash('sha256')
      .update(code_verifier)
      .digest('base64');

    return base64url.fromBase64(base64Digest);
  },
  async generateAuthorizationCode(str: string) {
    return createHash('sha256')
      .update(Date.now() + str)
      .digest('hex');
  },
  getOtp(): string {
    if (process.env.ENV === 'DEV' || process.env.ENV === 'LOCAL') {
      return '123456';
    } else if (
      process.env.ENV === 'QA' &&
      process.env.OTP_SERVICE_ACTIVE == 'false'
    ) {
      return '654321';
    } else if (
      process.env.ENV === 'UAT' &&
      process.env.OTP_SERVICE_ACTIVE == 'false'
    ) {
      return '444444';
    }
    return parseInt(randomBytes(6).toString('hex'), 16).toString().substr(0, 6);
  },

  updateDbSecretManagerPath(secret: string, serviceName: string, env: string) {
    let secretPath = secret + serviceName;

    if (env.toLowerCase() !== 'prod') {
      secretPath = `${secretPath}/${env.toLowerCase()}`;
    }
    return secretPath;
  },

  handleApiError(error: any) {
    // If error is null or undefined
    if (!error) {
      throw new BadRequestException('An unknown error occurred');
    }

    // If the error has a response (e.g., AxiosError)
    if (error.response) {
      const message =
        error.response?.data?.message ??
        error.response?.data ??
        'An error occurred while processing the request';

      const status = error.response?.status ?? HttpStatus.BAD_REQUEST;

      throw new HttpException(message, status);
    }

    // Fallback for standard JS/TS errors
    const fallbackMessage =
      typeof error.message === 'string' ? error.message : 'Unexpected error';
    throw new BadRequestException(fallbackMessage);
  },
};
