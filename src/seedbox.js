const rp = require("request-promise");
const querystring = require("querystring");

const { postData, getData } = require("./fetch");
const { logger } = require("./tools");
const config = require("../config");

function getCookie(headers) {
  let cookie;
  if (headers && headers["set-cookie"]) {
    cookie = headers["set-cookie"][0].split(";")[0];
  }

  return cookie;
}

/**
 * upload torrent
 */
module.exports.uploadTorrent = async (torrent) => {
  // allow for other torrent clients here
  if (/^deluge$/i.test(config.seedbox.client)) {
  } else {
    await uploadQbittorrent(torrent);
  }
};

/**
 * get a torrent's files list from the torrent's hash
 */
const getTorrentFiles = async (hash) => {
  const uri = `${config.seedbox.url}/api/v2/torrents/files?hash=${hash}`;
  return await getData({
    uri,
    jar: await getQbittorrentCookieJar(),
  });
};

/**
 * delete torrents given a list of hashes
 */
const deleteTorrent = async (hashes) => {
  const parameters = querystring.stringify({ deleteFiles: false, hashes });
  const uri = `${config.seedbox.url}/api/v2/torrents/delete?${parameters}`;

  return await getData({
    uri,
    jar: await getQbittorrentCookieJar(),
  });
};

module.exports.deleteUncategorizedRarTorrents = async function () {
  const uri = `${config.seedbox.url}/api/v2/sync/maindata`;

  const response = await getData({
    uri,
    jar: await getQbittorrentCookieJar(),
  });

  const torrents = Object.entries(response.torrents)
    .reduce((acc, [hash, torrent]) => {
      acc.push({ ...torrent, hash });
      return acc;
    }, [])
    .filter((torrent) => !torrent.category);

  for await (const torrent of torrents) {
    const files = await getTorrentFiles(torrent.hash);
    if (files.length > config.global.removeAboveNumberOfFiles)
      await deleteTorrent(torrent.hash);
  }

  await logger(`deleted rar files`);
};

let _jar = null;
async function getQbittorrentCookieJar() {
  if (_jar) return _jar;
  _jar = rp.jar();

  const body = {
    url: `${config.seedbox.url}/api/v2/auth/login`,
    jar: _jar,
    form: {
      username: config.seedbox.username,
      password: config.seedbox.password,
    },
  };

  await postData(body);

  return _jar;
}

/**
 * upload torent to a qbittorrent client
 * @param {Object} torrent
 */
async function uploadQbittorrent(torrent) {
  const formData = {
    paused: "true",
    autoTMM: "false",
    root_folder: "false",
    urls: torrent.downloadUrl,
    savepath: torrent.folderName,
    skip_checking: config.global.skipHashChecking ? "true" : "false",
  };

  const response = await postData({
    url: `${config.seedbox.url}/api/v2/torrents/add`,
    jar: await getQbittorrentCookieJar(),
    headers: { "Content-Type": "multipart/form-data" },
    formData,
  });

  if (!/ok/i.test(response)) await uploadError(response, torrent);
}

/**
 *
 */
async function uploadError(response, torrent) {
  await logger(`Error uploading torrent ${response}: ${torrent.downloadUrl}`);
}

async function getDelugeCookieJar() {
  if (_jar) return _jar;
  _jar = rp.jar();

  const form = {
    id: 1,
    method: "auth.login",
    params: [config.seedbox.password],
  };

  await postData({
    url: `${config.seedbox.url}/json`,
    jar: _jar,
    form,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return _jar;
}

/**
 * upload torent to a Deluge client
 * @param {Object} torrent
 */
async function uploadDeluge(torrent) {
  const form = {
    metainfo: torrent.downloadUrl,
    method: "webapi.add_torrent",
    params: { download_location: torrent.folderName },
  };

  const response = await postData({
    url: `${config.seedbox.url}/json`,
    jar: await getQbittorrentCookieJar(),
    headers: { "Content-Type": "multipart/form-data" },
    form,
  });
}
