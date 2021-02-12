const {
  logger,
  convertToGB,
  equalFloats,
  getFilteredIndexers,
} = require("./tools");
const { getData, putData } = require("./fetch");
const { readFromTable, writeToTable } = require("./storage");
const config = require("../config");
const { uploadTorrent } = require("./seedbox");

const _getSonarrApiPath = () => `${config.sonarr.url}/api/v3`;
const FILE_NAME = config.sonarr.storeFileName;

async function getAllIndexers() {
  const indexerList = await getData({
    uri: `${_getSonarrApiPath()}/indexer?apiKey=${config.sonarr.apiKey}`,
  });
  return indexerList;
}

async function setIndexer(indexer) {
  const indexerList = await putData({
    uri: `${_getSonarrApiPath()}/indexer/${indexer.id}?apiKey=${
      config.sonarr.apiKey
    }`,
    body: indexer,
  });
  return indexerList;
}

const getMatchingSeasons = async () => {
  const indexerList = await getAllIndexers();

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

  const seriesList = await getData({
    uri: `${_getSonarrApiPath()}/series?apiKey=${config.sonarr.apiKey}`,
  });

  for await (const series of seriesList) {
    for await (const season of series.seasons) {
      // only get seasons we have all episodes of
      if (season.statistics.percentOfEpisodes !== 100) continue;

      const seasonNumber = season.seasonNumber;
      const sizeOnDiskGB = convertToGB(season.statistics.sizeOnDisk);

      // create custom season for db table
      const _season = {
        id: `${series.title}-${series.id}-season${seasonNumber}`,
        seasonNumber,
        sizeOnDiskGB,
        title: series.title,
        titleSlug: series.titleSlug,
        path: series.path,
      };

      // skip if processed already
      const processedTorrent = await readFromTable(_season, FILE_NAME);
      if (processedTorrent) continue;

      // search for records on jackett
      await logger(
        `-- search for ${series.title} season ${seasonNumber} (${sizeOnDiskGB}GB)`
      );

      const seasonUrl = `${_getSonarrApiPath()}/release?seriesId=${
        series.id
      }&seasonNumber=${seasonNumber}&apiKey=${config.sonarr.apiKey}`;
      const seasonRecords = await getData({ uri: seasonUrl });

      // only get full season results
      const fullSeasonRecords = seasonRecords.filter(
        (record) => record.fullSeason
      );

      await logger(`found ${fullSeasonRecords.length} season records`);

      // for each record find a match
      for await (const record of fullSeasonRecords) {
        // see if the result matches an index we want
        const wantedIndexer = indexerNames.find(
          (indexerName) => record.indexer.toLowerCase() === indexerName
        );
        if (!wantedIndexer) continue;

        const recordSizeOnDiskGB = convertToGB(record.size);

        const closeSize = equalFloats(
          recordSizeOnDiskGB,
          sizeOnDiskGB,
          config.global.sizeThreshold
        );

        if (!closeSize) continue;

        await logger(
          `adding ${record.title} for ${_season.title} season ${seasonNumber}`
        );

        // upload if match
        await uploadTorrent({
          downloadUrl: record.downloadUrl,
          folderName: `${_season.path}/Season ${seasonNumber}`,
        });
      }

      // after processing all record save series season to db
      await writeToTable(_season, FILE_NAME);
    }
  }
};

(async () => {
  await getMatchingSeasons();
})();
