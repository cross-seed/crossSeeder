const querystring = require("querystring");

const { logger } = require("./tools");
const { getData } = require("./fetch");
const config = require("../config");

/**
 * get base radarr path - v2 or v3?
 */
const _getRadarrApiPath = () => {
  return `${config.radarr.url}/api`;
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
 * get list of torrents from radarr
 */
async function getMovieResults({ movieId, title }) {
  await logger(`finding: ${title}`);

  const parameters = querystring.stringify({
    movieId,
    apiKey: config.radarr.apiKey,
  });

  const searchUrl = `${_getRadarrApiPath()}/release?${parameters}`;
  let searchResults = await getData({ uri: searchUrl });
  await logger(`${searchResults.length} results found`);

  return searchResults;
}
module.exports.getMovieResults = getMovieResults;
