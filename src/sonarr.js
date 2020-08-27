const { logger, convertToGB, equalFloats } = require("./tools");
const { getData } = require("./fetch");
const { readFromTable, writeToTable } = require("./storage");
const config = require("../config");
const { uploadTorrent } = require("./seedbox");

const _getSonarrApiPath = () => `${config.sonarr.url}/api/v3`;

const getMatchingSeasons = async () => {
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
      const processedTorrent = await readFromTable(_season, "sonarr_sync");
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
      await writeToTable(_season, "sonarr_sync");
    }
  }
};

(async () => {
  await getMatchingSeasons();
})();
