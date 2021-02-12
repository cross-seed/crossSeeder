const FileSync = require("lowdb/adapters/FileSync");
const low = require("lowdb");
const moment = require("moment");

const config = require("../config");

let _db = null;
let _table = null;
let _fileName = null;

const dbTable = "torrents";
const timestampFormat = "MM/DD/YY hh:mma";

/**
 * return a db table
 */

function _getTable(fileName, table = dbTable) {
  if (!fileName) throw new Error("No fileName given for db file");

  // if we want the same db as before then just return it
  // so we dont keep opening the same file and possibly corrupting it
  if (_fileName === fileName && _table === table) return _table;
  _fileName = fileName;

  const adapter = new FileSync(`${__dirname}/stores/${fileName}.json`);
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
 * write a single record to the db
 */
const writeToTable = (record, fileName, table) => {
  const tableRecord = _getTable(fileName, table);

  const recordToSave = {
    id: record.id,
    title: record.title,
    titleSlug: record.titleSlug,
    relativePath: record.relativePath,
    writeTime: createTimeStamp(),
  };

  return tableRecord.push(recordToSave).write();
};
module.exports.writeToTable = writeToTable;

const _cache = {};

/**
 * return plain json object of a found record
 */
const readFromTable = (data, fileName, table) => {
  let tableRecord = null;

  if (_cache[fileName + table]) {
    tableRecord = _cache[fileName + table];
  } else {
    tableRecord = _getTable(fileName, table);
    _cache[fileName + table] = tableRecord;
  }

  const searchQuery = { id: data.id };
  if (data.relativePath) searchQuery.relativePath = data.relativePath;

  return tableRecord.find(searchQuery).value();
};
module.exports.readFromTable = readFromTable;

/**
 * delete an entire record
 */
const deleteFromTable = (data, fileName, table) => {
  const dbRecord = _readRawFromTable(data, fileName, table);
  if (!dbRecord.value()) return;

  _getTable(fileName, table).remove(data).write();
  return dbRecord.value();
};
module.exports.deleteFromTable = deleteFromTable;

/**
 * return raw object of a found record
 */
const _readRawFromTable = (findBy, fileName, table) => {
  const tableRecord = _getTable(fileName, table);
  const dbRecord = tableRecord.find(findBy);
  return dbRecord;
};
