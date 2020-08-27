const rimraf = require("rimraf");

const {
  checkMatchingMovie,
  logger,
  formatRecord,
  getFilteredIndexers,
  delay,
} = require("./tools");
const { readFromTable, writeToTable, deleteFromTable } = require("./storage");
const { uploadTorrent, deleteUncategorizedRarTorrents } = require("./seedbox");
const { getMovieList, getAllIndexers, getMovieResults } = require("./radarr");
const config = require("../config");

const FILE_NAME = "radarr";

const syncMovies = async () => {
  const indexerList = await getAllIndexers();

  // get all movies that are downloaded
  // format records and only get data we need - records are too big other wise for storage
  const movieList = await getMovieList();
  const records = movieList.records
    .filter((record) => record.downloaded && record.movieFile)
    .map(formatRecord);
  await logger(
    `${movieList.records.length} movies found and ${records.length} movies ready to process`
  );

  // filter by black/white lists in config
  const filteredIndexers = getFilteredIndexers(indexerList);

  const indexerNames = filteredIndexers
    .map((indexer) => indexer.name.toLowerCase())
    .join(`\n`);
  await logger(
    `${filteredIndexers.length} matching indexers found:\n${indexerNames}`
  );
  await logger(`-----------`);

  let numberOfMatches = 0;
  for await (const record of records) {
    // if torrent was already saved then skip
    const processedTorrent = await readFromTable(record, FILE_NAME);
    if (processedTorrent) continue;

    const searchResults = await getMovieResults({
      movieId: record.id,
      title: record.title,
    });

    for await (const result of searchResults) {
      // see if the result matches an index we want
      const wantedIndexer = indexerNames.find(
        (indexerName) => result.indexer.toLowerCase() === indexerName
      );
      if (!wantedIndexer) continue;

      // see if the result matches the settings we want
      const matchingTorrent = checkMatchingMovie(result, record);
      if (!matchingTorrent) continue;

      await logger(
        `match: ${matchingTorrent.title} - ${matchingTorrent.commentUrl}`
      );
      numberOfMatches++;

      await uploadTorrent(matchingTorrent);
    }

    // save that we have processed the movie record for a torrent site
    await writeToTable(record, FILE_NAME);
    await logger(`-^- ${numberOfMatches} matches found for ${record.title}`);

    delay();
  }

  if (config.global.removeAboveNumberOfFiles)
    await deleteUncategorizedRarTorrents();
};

async function deleteMovieById() {
  const [, , , ...movieIds] = process.argv;
  await logger(`deleting ${movieIds.join("\n")}`);
  await logger(`----------------`);

  for (const movieId of movieIds) {
    const isSlug = isNaN(parseInt(movieId));

    if (isSlug) {
      const result = deleteFromTable({ titleSlug: movieId }, FILE_NAME);
      if (result)
        await logger(
          `deleted movie with titleSlug ${movieId} (${result.title})`
        );
      else await logger(`could not delete movie with titleSlug ${movieId}`);
    } else {
      const result = deleteFromTable({ id: parseInt(movieId) }, FILE_NAME);
      if (result)
        await logger(`deleted movie with id ${movieId} (${result.title})`);
      else await logger(`could not delete movie with id ${movieId}`);
    }
  }
}

(async () => {
  const myArgs = process.argv;
  const deleteMovie = myArgs.includes("deleteMovie");
  const deleteRars = myArgs.includes("deleteRars");

  if (deleteMovie) {
    await deleteMovieById();
  } else if (deleteRars) {
    await deleteUncategorizedRarTorrents();
  } else {
    await syncMovies();
  }
})();
