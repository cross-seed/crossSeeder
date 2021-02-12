const {
  checkMatchingMovie,
  logger,
  formatRecord,
  getFilteredIndexers,
  delay,
} = require("./tools");

const { readFromTable, writeToTable, deleteFromTable } = require("./storage");
const { uploadTorrent, deleteUncategorizedRarTorrents } = require("./seedbox");
const {
  getMovieList,
  getAllIndexers,
  getMovieResults,
  setIndexer,
} = require("./radarr");
const config = require("../config");

const FILE_NAME = config.radarr.storeFileName;

const syncMovies = async () => {
  const indexerList = await getAllIndexers();

  // get all movies that are downloaded
  // format records and only get data we need - records are too big other wise for storage
  const movieList = await getMovieList();

  const records = movieList
    .filter((record) => {
      if (!record.movieFile) return false;

      // if we have quality filter then filter out content that doesnt match quality
      if (config.global.quality && config.global.quality.length > 0) {
        const recordQuality = (
          record.movieFile.quality.quality.name || ""
        ).toLowerCase();
        const matchedQuality = recordQuality.includes(config.global.quality);
        if (!matchedQuality) return false;
      }

      return true;
    })
    .map(formatRecord);

  await logger(
    `${movieList.length} movies found and ${records.length} movies ready to process`
  );

  // filter by black/white lists in config
  const filteredIndexers = getFilteredIndexers(indexerList);

  const indexerNames = filteredIndexers.map((indexer) =>
    indexer.name.toLowerCase()
  );

  await logger(
    `${filteredIndexers.length} matching indexers found:\n${indexerNames.join(
      `\n`
    )}`
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

    await logger(`${searchResults.length} results found`);
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
  const setIndexers = myArgs.includes("setIndexers");

  if (setIndexers) {
    const indexerList = await getAllIndexers();
    for await (let index of indexerList) {
      index.fields[0].value = index.fields[0].value.replace("xxx", "xxx");
      await setIndexer(index);
    }
  }

  if (deleteMovie) {
    await deleteMovieById();
  } else if (deleteRars) {
    await deleteUncategorizedRarTorrents();
  } else {
    await syncMovies();
  }
})();
