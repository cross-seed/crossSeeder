const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');
const moment = require('moment');

const config = require('../config');

let _db = null;
let _table = null;
let _fileName = null;

const dbTable = 'torrents';
const timestampFormat = 'MM/DD/YY hh:mma';

/**
 * return a db table
 */

function _getTable(fileName, table = dbTable) {
    if (!fileName) throw new Error('No fileName given for db file');

    // if we want the same db as before then just return it
    // so we dont keep opening the same file and possibly corrupting it
    if (_fileName === fileName && _table === table) return _table;
    _fileName = fileName;

    const adapter = new FileSync(`src/stores/${fileName}.json`);
    _db = low(adapter);

    _db.defaults({ [table]: [] }).write();
    _table = _db.get(table);

    return _table;
}

/**
 * create a timestamp
 */
const createTimeStamp = () => moment(new Date()).format(timestampFormat);

/**
 * allw to write multiple records to db
 */
const writeAllToTable = (data, fileName, table) => {
    const tableRecord = _getTable(fileName, table);
    const writeTime = createTimeStamp();

    if (Array.isArray(data)) return tableRecord.push(...data, writeTime).write();
    return tableRecord.push({ ...data, writeTime }).write();
}
module.exports.writeAllToTable = writeAllToTable;

/**
 * write a single record to the db
 */
const writeToTable = (record, fileName, table) => {
    const tableRecord = _getTable(fileName, table);

    const recordToSave = {
        id: record.id,
        title: record.title,
        relativePath: record.relativePath,
        writeTime: createTimeStamp(),
    };

    return tableRecord.push(recordToSave).write();
}
module.exports.writeToTable = writeToTable;

/**
 * return plain json object of a found record
 */
const readFromTable = (data, fileName, table) => {
    const tableRecord = _getTable(fileName, table);

    const searchQuery = { id: data.id };
    if (data.relativePath) searchQuery.relativePath = data.relativePath;

    return tableRecord.find(searchQuery).value();
}
module.exports.readFromTable = readFromTable;
