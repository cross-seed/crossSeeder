const querystring = require("querystring");

const { logger } = require("./tools");
const { getData, putData } = require("./fetch");
const config = require("../config");

/**
 * get base radarr path - v2 or v3?
 */
const _getRadarrApiPath = () => {
  return `${config.radarr.url}/api/v3`;
};

/**
 * get a list of movies from radarr that are downloaded already
 */
const getMovieList = async () => {
  const parameters = querystring.stringify({
    page: 1,
    pageSize: 99999,
    sortKey: "sortTitle",
    sortDir: "asc",
    apiKey: config.radarr.apiKey,
  });

  const movieListUrl = `${_getRadarrApiPath()}/movie?${parameters}`;

  const movieList = await getData({ uri: movieListUrl });
  return movieList;
};
module.exports.getMovieList = getMovieList;

function getIndexerUrl(indexerId) {
  const id = indexerId ? `/${indexerId}` : "";

  const parameters = querystring.stringify({ apiKey: config.radarr.apiKey });
  const url = `${_getRadarrApiPath()}/indexer${id}?${parameters}`;

  return url;
}

/**
 * get list of all indexers
 */
async function getAllIndexers() {
  const url = getIndexerUrl();
  const indexerList = await getData({ uri: url });
  return indexerList;
}
module.exports.getAllIndexers = getAllIndexers;

/**
 * save an indexer settings
 */
async function setIndexer(indexer) {
  const url = getIndexerUrl(indexer.id);
  const indexerList = await putData({ uri: url, body: indexer });
  return indexerList;
}
module.exports.setIndexer = setIndexer;

/**
 * get list of torrents from radarr
 */
async function getMovieResults({ movieId, title }) {
  await logger(`finding: ${title}`);

  const parameters = querystring.stringify({
    movieId,
    apiKey: config.radarr.apiKey,
  });

  const searchUrl = `${_getRadarrApiPath()}/release?${parameters}`;
  return await getData({ uri: searchUrl });
}
module.exports.getMovieResults = getMovieResults;
